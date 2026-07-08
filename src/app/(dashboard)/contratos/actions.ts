"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { generateInstallmentPlan } from "@/lib/contracts/installments";
import {
  contractSchema,
  paymentSchema,
  type ContractFormValues,
  type PaymentFormValues,
} from "@/lib/contracts/schema";
import { CONTRACT_STATUSES } from "@/lib/types/contract";

export async function searchClients(query: string) {
  const supabase = await createClient();
  let request = supabase
    .from("clients")
    .select("id, first_name, last_name, business_name, city")
    .is("deleted_at", null)
    .order("last_name", { ascending: true })
    .limit(8);

  const term = query.trim().replace(/[%_]/g, "");
  if (term) {
    request = request.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,business_name.ilike.%${term}%`
    );
  }

  const { data, error } = await request;
  if (error) return [];
  return data;
}

export async function createContract(values: ContractFormValues) {
  const parsed = contractSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const { client_id, title, start_date, notes, items, schedule_installation } = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .insert({
      client_id,
      title,
      start_date,
      notes: notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (contractError || !contract) return { error: "No se pudo crear el contrato" };

  for (const item of items) {
    const baseRow = {
      contract_id: contract.id,
      item_type: item.item_type,
      service_id: item.service_id,
      description: item.description,
      currency: item.currency,
    };

    if (item.item_type === "equipo_financiado") {
      const { data: contractItem, error: itemError } = await supabase
        .from("contract_items")
        .insert({
          ...baseRow,
          total_amount: item.total_amount,
          down_payment: item.down_payment,
          installments_count: item.installments_count,
          inventory_item_id: item.inventory_item_id || null,
        })
        .select("id")
        .single();

      if (itemError || !contractItem) return { error: "No se pudo crear el ítem de equipo financiado" };

      const plan = generateInstallmentPlan({
        totalAmount: item.total_amount,
        downPayment: item.down_payment,
        installmentsCount: item.installments_count,
        startDate: new Date(start_date),
      });

      if (plan.length > 0) {
        const { error: installmentsError } = await supabase.from("installments").insert(
          plan.map((entry) => ({
            contract_item_id: contractItem.id,
            number: entry.number,
            amount: entry.amount,
            due_date: entry.dueDate,
          }))
        );
        if (installmentsError) return { error: "No se pudo generar el plan de cuotas" };
      }

      if (item.inventory_item_id) {
        const { data: inventoryItem } = await supabase
          .from("inventory_items")
          .select("status")
          .eq("id", item.inventory_item_id)
          .single();

        if (inventoryItem?.status === "en_stock") {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          await supabase
            .from("inventory_items")
            .update({ status: "asignado", client_id })
            .eq("id", item.inventory_item_id);

          await supabase.from("inventory_movements").insert({
            inventory_item_id: item.inventory_item_id,
            from_status: "en_stock",
            to_status: "asignado",
            client_id,
            user_id: user?.id ?? null,
            notes: `Asignado por contrato: ${title}`,
          });
        }
      }
    } else if (item.item_type === "cargo_unico") {
      const { error: itemError } = await supabase.from("contract_items").insert({
        ...baseRow,
        single_amount: item.single_amount,
      });
      if (itemError) return { error: "No se pudo crear el cargo único" };
    } else {
      const monthlyAmount = item.subscription_breakdown.reduce(
        (sum, line) => sum + line.amount,
        0
      );

      const { data: contractItem, error: itemError } = await supabase
        .from("contract_items")
        .insert({
          ...baseRow,
          monthly_amount: monthlyAmount,
          subscription_breakdown: item.subscription_breakdown,
          billing_day: item.billing_day,
          subscription_start_date: item.subscription_start_date,
        })
        .select("id")
        .single();

      if (itemError || !contractItem) return { error: "No se pudo crear la suscripción" };

      const period = `${item.subscription_start_date.slice(0, 7)}-01`;
      const { error: chargeError } = await supabase.from("subscription_charges").insert({
        contract_item_id: contractItem.id,
        period,
        amount: monthlyAmount,
      });
      if (chargeError) return { error: "No se pudo generar el primer cargo de suscripción" };

      const { data: client } = await supabase
        .from("clients")
        .select("first_name, last_name")
        .eq("id", client_id)
        .single();
      const { data: servicesCategory } = await supabase
        .from("expense_categories")
        .select("id")
        .eq("name", "Servicios")
        .single();

      await supabase.from("recurring_expenses").insert({
        name: `Costo mensual Starlink — ${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim(),
        category_id: servicesCategory?.id ?? null,
        contract_id: contract.id,
        amount: monthlyAmount,
        currency: item.currency,
        day_of_month: item.billing_day,
      });
    }
  }

  if (schedule_installation) {
    const { data: client } = await supabase
      .from("clients")
      .select("address")
      .eq("id", client_id)
      .single();

    await supabase.from("appointments").insert({
      client_id,
      contract_id: contract.id,
      type: "instalacion",
      start_at: schedule_installation.start_at,
      end_at: schedule_installation.end_at,
      address: client?.address ?? null,
    });

    revalidatePath("/agenda");
  }

  revalidatePath("/contratos");
  revalidatePath(`/clientes/${client_id}`);
  revalidatePath("/stock");
  redirect(`/contratos/${contract.id}`);
}

export async function payInstallment(installmentId: string, values: PaymentFormValues) {
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();

  const { data: installment, error: fetchError } = await supabase
    .from("installments")
    .select("id, number, amount, status, contract_items(id, currency, description, contract_id)")
    .eq("id", installmentId)
    .single();

  if (fetchError || !installment) return { error: "Cuota no encontrada" };
  if (installment.status === "pagada") return { error: "La cuota ya está pagada" };

  const contractItem = Array.isArray(installment.contract_items)
    ? installment.contract_items[0]
    : installment.contract_items;
  if (!contractItem) return { error: "No se encontró el ítem del contrato" };

  const { error: updateError } = await supabase
    .from("installments")
    .update({
      status: "pagada",
      paid_at: parsed.data.paid_at,
      payment_method: parsed.data.payment_method,
    })
    .eq("id", installmentId);

  if (updateError) return { error: "No se pudo registrar el pago" };

  const { error: txError } = await supabase.from("transactions").insert({
    type: "ingreso",
    origin: "cuota",
    installment_id: installmentId,
    amount: installment.amount,
    currency: contractItem.currency,
    date: parsed.data.paid_at,
    description: `Cuota ${installment.number} — ${contractItem.description}`,
  });

  if (txError) return { error: "El pago se registró pero no se pudo generar el ingreso" };

  revalidatePath(`/contratos/${contractItem.contract_id}`);
  return { error: null };
}

export async function paySubscriptionCharge(chargeId: string, values: PaymentFormValues) {
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();

  const { data: charge, error: fetchError } = await supabase
    .from("subscription_charges")
    .select("id, period, amount, status, contract_items(id, currency, description, contract_id)")
    .eq("id", chargeId)
    .single();

  if (fetchError || !charge) return { error: "Cargo no encontrado" };
  if (charge.status === "pagada") return { error: "El cargo ya está pagado" };

  const contractItem = Array.isArray(charge.contract_items)
    ? charge.contract_items[0]
    : charge.contract_items;
  if (!contractItem) return { error: "No se encontró el ítem del contrato" };

  const { error: updateError } = await supabase
    .from("subscription_charges")
    .update({
      status: "pagada",
      paid_at: parsed.data.paid_at,
      payment_method: parsed.data.payment_method,
    })
    .eq("id", chargeId);

  if (updateError) return { error: "No se pudo registrar el pago" };

  const { error: txError } = await supabase.from("transactions").insert({
    type: "ingreso",
    origin: "suscripcion",
    subscription_charge_id: chargeId,
    amount: charge.amount,
    currency: contractItem.currency,
    date: parsed.data.paid_at,
    description: `Suscripción ${charge.period} — ${contractItem.description}`,
  });

  if (txError) return { error: "El pago se registró pero no se pudo generar el ingreso" };

  revalidatePath(`/contratos/${contractItem.contract_id}`);
  return { error: null };
}

export async function changeContractStatus(
  contractId: string,
  status: (typeof CONTRACT_STATUSES)[number]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("contracts")
    .update({ status, updated_by: user?.id ?? null })
    .eq("id", contractId);

  if (error) return { error: "No se pudo cambiar el estado del contrato" };

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${contractId}`);
  return { error: null };
}
