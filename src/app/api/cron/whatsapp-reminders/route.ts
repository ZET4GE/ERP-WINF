import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneToWhatsApp } from "@/lib/phone";
import { buildAppointmentReminderMessage } from "@/lib/appointments/whatsapp";
import { sendWhatsAppMessage, type WhatsAppSendResult } from "@/lib/whatsapp/provider";
import {
  buildCuotaReminderMessage,
  filterAppointmentsForReminder,
  filterCuotasForReminder,
  toArgentinaDateOnly,
  type CuotaForReminder,
} from "@/lib/whatsapp/reminders-logic";
import type { AppointmentType } from "@/lib/types/appointment";

// Cron diario de recordatorios (Fase 12). Vercel Cron lo llama por GET todos
// los días (ver `vercel.json`). Idempotente: cada recordatorio se guarda con
// `unique (reference_table, reference_id)` en `whatsapp_reminders`, y solo se
// reintenta el envío si el intento anterior no quedó en 'enviado' (fallo,
// sin teléfono o sin proveedor configurado todavía).
export const dynamic = "force-dynamic";

const DEFAULT_DAYS_BEFORE = 3;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
  const secretFromHeader = bearerMatch?.[1];

  const url = new URL(request.url);
  const secretFromQuery = url.searchParams.get("secret");

  const provided = secretFromHeader ?? secretFromQuery;
  return provided === cronSecret;
}

function reminderStatus(result: WhatsAppSendResult): "enviado" | "error" | "sin_configurar" {
  if (result.success) return "enviado";
  if (result.error === "sin_configurar") return "sin_configurar";
  return "error";
}

interface ReminderLogRow {
  type: "turno" | "cuota";
  reference_table: "appointments" | "installments" | "subscription_charges";
  reference_id: string;
  client_id: string;
  status: "enviado" | "error" | "sin_telefono" | "sin_configurar";
  message: string | null;
  error_message: string | null;
  sent_at: string | null;
  updated_at: string;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const today = toArgentinaDateOnly(nowIso);
  const tomorrow = toArgentinaDateOnly(
    new Date(new Date(nowIso).getTime() + 24 * 60 * 60 * 1000).toISOString()
  );
  const daysBefore = Number(process.env.WHATSAPP_REMINDER_DAYS_BEFORE) || DEFAULT_DAYS_BEFORE;

  try {
    const { data: existingRemindersData, error: existingRemindersError } = await supabase
      .from("whatsapp_reminders")
      .select("reference_table, reference_id")
      .eq("status", "enviado");

    if (existingRemindersError) {
      return NextResponse.json(
        { error: `No se pudieron leer los recordatorios ya enviados: ${existingRemindersError.message}` },
        { status: 500 }
      );
    }

    const alreadySentAppointmentIds = new Set(
      (existingRemindersData ?? [])
        .filter((r) => r.reference_table === "appointments")
        .map((r) => r.reference_id as string)
    );
    const alreadySentCuotaIds = new Set(
      (existingRemindersData ?? [])
        .filter((r) => r.reference_table !== "appointments")
        .map((r) => `${r.reference_table}:${r.reference_id}`)
    );

    // ------------------------------------------------------------------
    // (a) Turnos de mañana
    // ------------------------------------------------------------------
    const rangeStart = nowIso;
    const rangeEnd = new Date(new Date(nowIso).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from("appointments")
      .select("id, start_at, status, type, client:clients(id, first_name, phone)")
      .in("status", ["pendiente", "confirmado"])
      .gte("start_at", rangeStart)
      .lt("start_at", rangeEnd);

    if (appointmentsError) {
      return NextResponse.json(
        { error: `No se pudieron leer los turnos: ${appointmentsError.message}` },
        { status: 500 }
      );
    }

    type AppointmentRow = {
      id: string;
      start_at: string;
      status: string;
      type: string;
      client: { id: string; first_name: string; phone: string | null } | null;
    };

    const appointments = (appointmentsData ?? []) as unknown as AppointmentRow[];

    const appointmentsToRemind = filterAppointmentsForReminder(
      appointments.map((a) => ({ id: a.id, startAt: a.start_at, status: a.status })),
      tomorrow,
      alreadySentAppointmentIds
    );

    const appointmentById = new Map(appointments.map((a) => [a.id, a]));
    const logRows: ReminderLogRow[] = [];

    for (const item of appointmentsToRemind) {
      const appointment = appointmentById.get(item.id);
      if (!appointment?.client) continue;

      const updatedAt = new Date().toISOString();

      if (!appointment.client.phone) {
        logRows.push({
          type: "turno",
          reference_table: "appointments",
          reference_id: appointment.id,
          client_id: appointment.client.id,
          status: "sin_telefono",
          message: null,
          error_message: null,
          sent_at: null,
          updated_at: updatedAt,
        });
        continue;
      }

      const message = buildAppointmentReminderMessage({
        clientFirstName: appointment.client.first_name,
        type: appointment.type as AppointmentType,
        startAt: appointment.start_at,
      });

      const phone = normalizePhoneToWhatsApp(appointment.client.phone);
      const result = await sendWhatsAppMessage(phone, message);

      logRows.push({
        type: "turno",
        reference_table: "appointments",
        reference_id: appointment.id,
        client_id: appointment.client.id,
        status: reminderStatus(result),
        message,
        error_message: result.success ? null : (result.error ?? null),
        sent_at: result.success ? updatedAt : null,
        updated_at: updatedAt,
      });
    }

    // ------------------------------------------------------------------
    // (b) Cuotas por vencer (installments + subscription_charges)
    // ------------------------------------------------------------------
    const { data: installmentsData, error: installmentsError } = await supabase
      .from("installments")
      .select(
        `id, amount, due_date, status,
         contract_item:contract_items(id, description, currency,
           contract:contracts(id, client_id, client:clients(id, first_name, phone)))`
      )
      .eq("status", "pendiente");

    if (installmentsError) {
      return NextResponse.json(
        { error: `No se pudieron leer las cuotas: ${installmentsError.message}` },
        { status: 500 }
      );
    }

    const { data: chargesData, error: chargesError } = await supabase
      .from("subscription_charges")
      .select(
        `id, amount, period, status,
         contract_item:contract_items(id, description, currency, billing_day,
           contract:contracts(id, client_id, client:clients(id, first_name, phone)))`
      )
      .eq("status", "pendiente");

    if (chargesError) {
      return NextResponse.json(
        { error: `No se pudieron leer los cargos de suscripción: ${chargesError.message}` },
        { status: 500 }
      );
    }

    type ContractItemJoin = {
      id: string;
      description: string;
      currency: "ARS" | "USD";
      billing_day?: number | null;
      contract: {
        id: string;
        client_id: string;
        client: { id: string; first_name: string; phone: string | null } | null;
      } | null;
    };

    type InstallmentRow = {
      id: string;
      amount: number;
      due_date: string;
      status: string;
      contract_item: ContractItemJoin | null;
    };

    type SubscriptionChargeRow = {
      id: string;
      amount: number;
      period: string;
      status: string;
      contract_item: ContractItemJoin | null;
    };

    const installments = (installmentsData ?? []) as unknown as InstallmentRow[];
    const charges = (chargesData ?? []) as unknown as SubscriptionChargeRow[];

    interface CuotaDetail extends CuotaForReminder {
      amount: number;
      currency: "ARS" | "USD";
      description: string;
      clientId: string;
      clientFirstName: string;
      phone: string | null;
    }

    const cuotaDetails: CuotaDetail[] = [];

    for (const row of installments) {
      const client = row.contract_item?.contract?.client;
      if (!client) continue;
      cuotaDetails.push({
        id: row.id,
        table: "installments",
        dueDate: row.due_date,
        status: row.status,
        amount: row.amount,
        currency: row.contract_item!.currency,
        description: row.contract_item!.description,
        clientId: client.id,
        clientFirstName: client.first_name,
        phone: client.phone,
      });
    }

    for (const row of charges) {
      const client = row.contract_item?.contract?.client;
      if (!client) continue;
      const billingDay = row.contract_item?.billing_day ?? 1;
      const dueDate = `${row.period.slice(0, 7)}-${String(billingDay).padStart(2, "0")}`;
      cuotaDetails.push({
        id: row.id,
        table: "subscription_charges",
        dueDate,
        status: row.status,
        amount: row.amount,
        currency: row.contract_item!.currency,
        description: row.contract_item!.description,
        clientId: client.id,
        clientFirstName: client.first_name,
        phone: client.phone,
      });
    }

    const cuotasToRemind = filterCuotasForReminder(
      cuotaDetails,
      today,
      daysBefore,
      alreadySentCuotaIds
    );

    for (const cuota of cuotasToRemind) {
      const updatedAt = new Date().toISOString();

      if (!cuota.phone) {
        logRows.push({
          type: "cuota",
          reference_table: cuota.table,
          reference_id: cuota.id,
          client_id: cuota.clientId,
          status: "sin_telefono",
          message: null,
          error_message: null,
          sent_at: null,
          updated_at: updatedAt,
        });
        continue;
      }

      const message = buildCuotaReminderMessage({
        clientFirstName: cuota.clientFirstName,
        description: cuota.description,
        amount: cuota.amount,
        currency: cuota.currency,
        dueDate: cuota.dueDate,
      });

      const phone = normalizePhoneToWhatsApp(cuota.phone);
      const result = await sendWhatsAppMessage(phone, message);

      logRows.push({
        type: "cuota",
        reference_table: cuota.table,
        reference_id: cuota.id,
        client_id: cuota.clientId,
        status: reminderStatus(result),
        message,
        error_message: result.success ? null : (result.error ?? null),
        sent_at: result.success ? updatedAt : null,
        updated_at: updatedAt,
      });
    }

    if (logRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("whatsapp_reminders")
        .upsert(logRows, { onConflict: "reference_table,reference_id" });

      if (upsertError) {
        return NextResponse.json(
          { error: `No se pudieron registrar los recordatorios: ${upsertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      today,
      tomorrow,
      appointmentsProcessed: appointmentsToRemind.length,
      cuotasProcessed: cuotasToRemind.length,
      sent: logRows.filter((r) => r.status === "enviado").length,
      errors: logRows.filter((r) => r.status === "error").length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error inesperado ejecutando el cron de recordatorios: ${message}` },
      { status: 500 }
    );
  }
}
