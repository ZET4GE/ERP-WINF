"use server";

import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import {
  manualExpenseSchema,
  recurringExpenseSchema,
  type RecurringExpenseFormValues,
} from "@/lib/finance/schema";
import { loadMonthlyReportData } from "@/lib/finance/monthly-report";
import { buildMonthlyReportWorkbook } from "@/lib/finance/report-excel";
import { MonthlyReportPdfTemplate } from "@/lib/finance/report-pdf-template";
import { normalizePhoneToWhatsApp } from "@/lib/phone";
import { buildCuotaReminderMessage } from "@/lib/whatsapp/reminders-logic";
import { sendWhatsAppMessage } from "@/lib/whatsapp/provider";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthLabel(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const label = format(new Date(year, monthNum - 1, 1), "MMMM yyyy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export async function createManualExpense(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = manualExpenseSchema.safeParse({
    category_id: typeof raw.category_id === "string" ? raw.category_id : "",
    amount: Number(raw.amount),
    currency: raw.currency,
    date: typeof raw.date === "string" ? raw.date : "",
    description: typeof raw.description === "string" ? raw.description : undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { category_id, amount, currency, date, description } = parsed.data;
  const supabase = await createClient();

  const file = formData.get("file");
  let attachmentUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
    const path = `manual/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) return { error: "No se pudo subir el adjunto" };
    attachmentUrl = path;
  }

  const { error } = await supabase.from("transactions").insert({
    type: "egreso",
    origin: "gasto_manual",
    category_id,
    amount,
    currency,
    date,
    description: description || null,
    attachment_url: attachmentUrl,
  });

  if (error) return { error: "No se pudo registrar el gasto" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function createRecurringExpense(values: RecurringExpenseFormValues) {
  const parsed = recurringExpenseSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { name, category_id, amount, currency, day_of_month, active } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("recurring_expenses").insert({
    name,
    category_id: category_id || null,
    amount,
    currency,
    day_of_month,
    active,
  });

  if (error) return { error: "No se pudo crear el gasto recurrente" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function updateRecurringExpense(id: string, values: RecurringExpenseFormValues) {
  const parsed = recurringExpenseSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { name, category_id, amount, currency, day_of_month, active } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("recurring_expenses")
    .update({ name, category_id: category_id || null, amount, currency, day_of_month, active })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el gasto recurrente" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function toggleRecurringExpenseActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").update({ active }).eq("id", id);

  if (error) return { error: "No se pudo cambiar el estado" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function deleteRecurringExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);

  if (error) return { error: "No se pudo borrar el gasto recurrente" };

  revalidatePath("/finanzas");
  return { error: null };
}

export async function generateMonthlyReportExcel(month: string) {
  if (!MONTH_PATTERN.test(month)) return { error: "Mes inválido" };

  const data = await loadMonthlyReportData(month);
  const label = monthLabel(month);
  const buffer = await buildMonthlyReportWorkbook(data, label);

  return {
    error: null,
    base64: Buffer.from(buffer).toString("base64"),
    filename: `winf-finanzas-${month}.xlsx`,
  };
}

export async function generateMonthlyReportPdf(month: string) {
  if (!MONTH_PATTERN.test(month)) return { error: "Mes inválido" };

  const data = await loadMonthlyReportData(month);
  const label = monthLabel(month);
  const buffer = await renderToBuffer(<MonthlyReportPdfTemplate data={data} monthLabel={label} />);

  return {
    error: null,
    base64: buffer.toString("base64"),
    filename: `winf-finanzas-${month}.pdf`,
  };
}

export async function sendManualCuotaReminder(
  table: "installments" | "subscription_charges",
  id: string
) {
  const supabase = await createClient();

  const selectColumns =
    table === "installments"
      ? `id, amount, due_date, status,
         contract_item:contract_items(id, description, currency,
           contract:contracts(id, client_id, client:clients(id, first_name, phone)))`
      : `id, amount, period, status,
         contract_item:contract_items(id, description, currency, billing_day,
           contract:contracts(id, client_id, client:clients(id, first_name, phone)))`;

  const { data, error } = await supabase.from(table).select(selectColumns).eq("id", id).single();
  if (error || !data) return { error: "No se encontró la cuota" };

  type Row = {
    id: string;
    amount: number;
    status: string;
    due_date?: string;
    period?: string;
    contract_item: {
      description: string;
      currency: "ARS" | "USD";
      billing_day?: number | null;
      contract: {
        client_id: string;
        client: { id: string; first_name: string; phone: string | null } | null;
      } | null;
    } | null;
  };

  const row = data as unknown as Row;
  const client = row.contract_item?.contract?.client;
  if (!client) return { error: "No se encontró el cliente de la cuota" };
  if (row.status !== "pendiente" && row.status !== "vencida") {
    return { error: "Esta cuota ya no está pendiente de pago" };
  }
  if (!client.phone) return { error: "El cliente no tiene un teléfono cargado" };

  const dueDate =
    table === "installments"
      ? row.due_date!
      : `${row.period!.slice(0, 7)}-${String(row.contract_item?.billing_day ?? 1).padStart(2, "0")}`;

  const message = buildCuotaReminderMessage({
    clientFirstName: client.first_name,
    description: row.contract_item!.description,
    amount: row.amount,
    currency: row.contract_item!.currency,
    dueDate,
  });

  const phone = normalizePhoneToWhatsApp(client.phone);
  const result = await sendWhatsAppMessage(phone, message);
  const sentAt = new Date().toISOString();

  const status: "enviado" | "error" | "sin_configurar" = result.success
    ? "enviado"
    : result.error === "sin_configurar"
      ? "sin_configurar"
      : "error";

  const { error: logError } = await supabase.from("whatsapp_reminders").upsert(
    {
      type: "cuota" as const,
      reference_table: table,
      reference_id: id,
      client_id: client.id,
      status,
      message,
      error_message: result.success ? null : (result.error ?? null),
      sent_at: result.success ? sentAt : null,
      updated_at: sentAt,
    },
    { onConflict: "reference_table,reference_id" }
  );

  if (logError) return { error: "No se pudo registrar el recordatorio" };
  if (!result.success) {
    return {
      error:
        status === "sin_configurar"
          ? "Todavía no configuraste un proveedor de WhatsApp (ver .env.example)"
          : `No se pudo enviar el recordatorio: ${result.error ?? "error desconocido"}`,
    };
  }

  revalidatePath("/finanzas");
  revalidatePath("/configuracion");
  return { error: null };
}

export async function getReceiptUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);

  if (error || !data) return { error: "No se pudo generar el enlace del adjunto", url: null };

  return { error: null, url: data.signedUrl };
}
