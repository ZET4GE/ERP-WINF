import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeClientsToMarkAsOverdue,
  computeOverdueToMark,
  computeRecurringExpenseTransactionsToCreate,
  computeSubscriptionChargesToCreate,
  type ActiveRecurringExpense,
  type ActiveSubscriptionItem,
} from "@/lib/finance/cron-logic";

// Cron mensual de Finanzas (Fase 8). Vercel Cron lo llama por GET el día 1 de
// cada mes (ver `vercel.json`). Idempotente: correrlo dos veces el mismo mes
// no duplica subscription_charges (constraint unique + upsert ignoreDuplicates
// y filtro a nivel aplicación) ni egresos de gastos recurrentes (filtro a
// nivel aplicación, sin constraint de unicidad en `transactions`), y no
// vuelve a marcar 'vencida' lo que ya dejó de estar 'pendiente'.
export const dynamic = "force-dynamic";

function todayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentPeriod(today: string): string {
  return `${today.slice(0, 7)}-01`;
}

// Primer día del mes siguiente al de `period` ("yyyy-MM-01"), usado como
// límite exclusivo para acotar transactions "de este mes".
function nextPeriod(period: string): string {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayDateOnly();
  const period = currentPeriod(today);

  try {
    // ------------------------------------------------------------------
    // (a) subscription_charges del período para cada suscripción activa
    // ------------------------------------------------------------------
    const { data: activeContractsData, error: activeContractsError } = await supabase
      .from("contracts")
      .select("id")
      .eq("status", "activo");

    if (activeContractsError) {
      return NextResponse.json(
        { error: `No se pudieron leer los contratos activos: ${activeContractsError.message}` },
        { status: 500 }
      );
    }

    const activeContractIds = (activeContractsData ?? []).map((row) => row.id as string);

    let activeSubscriptionItems: ActiveSubscriptionItem[] = [];
    if (activeContractIds.length > 0) {
      const { data: subscriptionItemsData, error: subscriptionItemsError } = await supabase
        .from("contract_items")
        .select("id, monthly_amount, currency")
        .eq("item_type", "suscripcion")
        .in("contract_id", activeContractIds);

      if (subscriptionItemsError) {
        return NextResponse.json(
          { error: `No se pudieron leer las suscripciones activas: ${subscriptionItemsError.message}` },
          { status: 500 }
        );
      }

      activeSubscriptionItems = (subscriptionItemsData ?? []).map((row) => ({
        id: row.id as string,
        monthlyAmount: (row.monthly_amount as number | null) ?? 0,
        currency: row.currency as "ARS" | "USD",
      }));
    }

    const { data: existingChargesData, error: existingChargesError } = await supabase
      .from("subscription_charges")
      .select("contract_item_id, period")
      .eq("period", period);

    if (existingChargesError) {
      return NextResponse.json(
        { error: `No se pudieron leer los cargos de suscripción existentes: ${existingChargesError.message}` },
        { status: 500 }
      );
    }

    const existingCharges = (existingChargesData ?? []).map((row) => ({
      contractItemId: row.contract_item_id as string,
      period: row.period as string,
    }));

    const chargesToCreate = computeSubscriptionChargesToCreate(
      period,
      activeSubscriptionItems,
      existingCharges
    );

    let subscriptionChargesCreated = 0;
    if (chargesToCreate.length > 0) {
      const { data: insertedCharges, error: insertChargesError } = await supabase
        .from("subscription_charges")
        .upsert(
          chargesToCreate.map((charge) => ({
            contract_item_id: charge.contractItemId,
            period: charge.period,
            amount: charge.amount,
          })),
          { onConflict: "contract_item_id,period", ignoreDuplicates: true }
        )
        .select("id");

      if (insertChargesError) {
        return NextResponse.json(
          { error: `No se pudieron crear los cargos de suscripción: ${insertChargesError.message}` },
          { status: 500 }
        );
      }

      subscriptionChargesCreated = insertedCharges?.length ?? 0;
    }

    // ------------------------------------------------------------------
    // (b) transactions de egreso por cada gasto recurrente activo
    // ------------------------------------------------------------------
    const { data: activeExpensesData, error: activeExpensesError } = await supabase
      .from("recurring_expenses")
      .select("id, name, amount, currency, category_id, contract_id")
      .eq("active", true);

    if (activeExpensesError) {
      return NextResponse.json(
        { error: `No se pudieron leer los gastos recurrentes activos: ${activeExpensesError.message}` },
        { status: 500 }
      );
    }

    const activeExpenses = activeExpensesData ?? [];
    const activeRecurringExpenses: ActiveRecurringExpense[] = activeExpenses.map((row) => ({
      id: row.id as string,
      amount: row.amount as number,
      currency: row.currency as "ARS" | "USD",
      categoryId: row.category_id as string | null,
      contractId: row.contract_id as string | null,
    }));

    const monthEnd = nextPeriod(period);
    const { data: existingTxData, error: existingTxError } = await supabase
      .from("transactions")
      .select("recurring_expense_id")
      .eq("origin", "gasto_recurrente")
      .gte("date", period)
      .lt("date", monthEnd);

    if (existingTxError) {
      return NextResponse.json(
        { error: `No se pudieron leer los egresos recurrentes del mes: ${existingTxError.message}` },
        { status: 500 }
      );
    }

    const existingRecurringExpenseTransactions = (existingTxData ?? [])
      .filter((row) => row.recurring_expense_id !== null)
      .map((row) => ({ recurringExpenseId: row.recurring_expense_id as string }));

    const expenseTransactionsToCreate = computeRecurringExpenseTransactionsToCreate(
      activeRecurringExpenses,
      existingRecurringExpenseTransactions
    );

    let recurringExpensesCreated = 0;
    if (expenseTransactionsToCreate.length > 0) {
      const nameById = new Map(activeExpenses.map((row) => [row.id as string, row.name as string]));
      const rows = expenseTransactionsToCreate.map((expense) => ({
        type: "egreso" as const,
        origin: "gasto_recurrente" as const,
        recurring_expense_id: expense.recurringExpenseId,
        category_id: expense.categoryId,
        amount: expense.amount,
        currency: expense.currency,
        date: today,
        description: nameById.get(expense.recurringExpenseId) ?? null,
      }));

      const { data: insertedTx, error: insertTxError } = await supabase
        .from("transactions")
        .insert(rows)
        .select("id");

      if (insertTxError) {
        return NextResponse.json(
          { error: `No se pudieron crear los egresos recurrentes: ${insertTxError.message}` },
          { status: 500 }
        );
      }

      recurringExpensesCreated = insertedTx?.length ?? 0;
    }

    // ------------------------------------------------------------------
    // (c) marcar vencidas las cuotas/cargos impagos y actualizar morosos
    // ------------------------------------------------------------------
    const { data: pendingInstallmentsData, error: pendingInstallmentsError } = await supabase
      .from("installments")
      .select("id, due_date")
      .eq("status", "pendiente");

    if (pendingInstallmentsError) {
      return NextResponse.json(
        { error: `No se pudieron leer las cuotas pendientes: ${pendingInstallmentsError.message}` },
        { status: 500 }
      );
    }

    const { data: pendingChargesData, error: pendingChargesError } = await supabase
      .from("subscription_charges")
      .select("id, period")
      .eq("status", "pendiente");

    if (pendingChargesError) {
      return NextResponse.json(
        { error: `No se pudieron leer los cargos de suscripción pendientes: ${pendingChargesError.message}` },
        { status: 500 }
      );
    }

    const overdue = computeOverdueToMark(
      today,
      (pendingInstallmentsData ?? []).map((row) => ({
        id: row.id as string,
        dueDate: row.due_date as string,
      })),
      (pendingChargesData ?? []).map((row) => ({
        id: row.id as string,
        period: row.period as string,
      }))
    );

    if (overdue.installmentIds.length > 0) {
      const { error: markInstallmentsError } = await supabase
        .from("installments")
        .update({ status: "vencida" })
        .in("id", overdue.installmentIds);

      if (markInstallmentsError) {
        return NextResponse.json(
          { error: `No se pudieron marcar cuotas vencidas: ${markInstallmentsError.message}` },
          { status: 500 }
        );
      }
    }

    if (overdue.subscriptionChargeIds.length > 0) {
      const { error: markChargesError } = await supabase
        .from("subscription_charges")
        .update({ status: "vencida" })
        .in("id", overdue.subscriptionChargeIds);

      if (markChargesError) {
        return NextResponse.json(
          { error: `No se pudieron marcar cargos de suscripción vencidos: ${markChargesError.message}` },
          { status: 500 }
        );
      }
    }

    // Mapa contract_item_id -> client_id, para poder contar vencidos por
    // cliente (installments y subscription_charges no tienen client_id
    // directo; hay que atravesar contract_items -> contracts).
    const { data: contractItemsData, error: contractItemsError } = await supabase
      .from("contract_items")
      .select("id, contract_id");

    if (contractItemsError) {
      return NextResponse.json(
        { error: `No se pudieron leer los ítems de contrato: ${contractItemsError.message}` },
        { status: 500 }
      );
    }

    const { data: contractsData, error: contractsError } = await supabase
      .from("contracts")
      .select("id, client_id");

    if (contractsError) {
      return NextResponse.json(
        { error: `No se pudieron leer los contratos: ${contractsError.message}` },
        { status: 500 }
      );
    }

    const clientIdByContractId = new Map<string, string>(
      (contractsData ?? []).map((row) => [row.id as string, row.client_id as string])
    );

    const clientIdByContractItemId = new Map<string, string>();
    for (const row of contractItemsData ?? []) {
      const clientId = clientIdByContractId.get(row.contract_id as string);
      if (clientId) clientIdByContractItemId.set(row.id as string, clientId);
    }

    const { data: overdueInstallmentsData, error: overdueInstallmentsError } = await supabase
      .from("installments")
      .select("id, contract_item_id")
      .eq("status", "vencida");

    if (overdueInstallmentsError) {
      return NextResponse.json(
        { error: `No se pudieron leer las cuotas vencidas: ${overdueInstallmentsError.message}` },
        { status: 500 }
      );
    }

    const { data: overdueChargesData, error: overdueChargesError } = await supabase
      .from("subscription_charges")
      .select("id, contract_item_id")
      .eq("status", "vencida");

    if (overdueChargesError) {
      return NextResponse.json(
        { error: `No se pudieron leer los cargos de suscripción vencidos: ${overdueChargesError.message}` },
        { status: 500 }
      );
    }

    const overdueCountByClientId: Record<string, number> = {};
    for (const row of overdueInstallmentsData ?? []) {
      const clientId = clientIdByContractItemId.get(row.contract_item_id as string);
      if (!clientId) continue;
      overdueCountByClientId[clientId] = (overdueCountByClientId[clientId] ?? 0) + 1;
    }
    for (const row of overdueChargesData ?? []) {
      const clientId = clientIdByContractItemId.get(row.contract_item_id as string);
      if (!clientId) continue;
      overdueCountByClientId[clientId] = (overdueCountByClientId[clientId] ?? 0) + 1;
    }

    const clientsToMarkOverdue = computeClientsToMarkAsOverdue(overdueCountByClientId);

    if (clientsToMarkOverdue.length > 0) {
      const { error: markClientsError } = await supabase
        .from("clients")
        .update({ status: "moroso" })
        .in("id", clientsToMarkOverdue);

      if (markClientsError) {
        return NextResponse.json(
          { error: `No se pudieron marcar clientes morosos: ${markClientsError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      period,
      subscriptionChargesCreated,
      recurringExpensesCreated,
      installmentsMarkedOverdue: overdue.installmentIds.length,
      subscriptionChargesMarkedOverdue: overdue.subscriptionChargeIds.length,
      clientsMarkedOverdue: clientsToMarkOverdue.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error inesperado ejecutando el cron mensual: ${message}` },
      { status: 500 }
    );
  }
}
