import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { TransactionFilters } from "@/components/finance/transaction-filters";
import { TransactionsTable } from "@/components/finance/transactions-table";
import { ManualExpenseForm } from "@/components/finance/manual-expense-form";
import { RecurringExpenseForm } from "@/components/finance/recurring-expense-form";
import { RecurringExpensesList } from "@/components/finance/recurring-expenses-list";
import { MonthlyReportCard } from "@/components/finance/monthly-report-card";
import {
  MonthlySummary,
  type CategoryBreakdownItem,
  type MonthlyPoint,
} from "@/components/finance/monthly-summary";
import { TRANSACTION_ORIGINS, TRANSACTION_TYPES } from "@/lib/types/finance";
import type {
  ExpenseCategory,
  RecurringExpenseWithRelations,
  TransactionWithRelations,
} from "@/lib/types/finance";

export const metadata: Metadata = { title: "Finanzas — WINF ERP" };

interface SummaryRow {
  type: "ingreso" | "egreso";
  amount: number;
  currency: "ARS" | "USD";
  date: string;
  category_id: string | null;
  category: { id: string; name: string } | null;
}

function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tipo = typeof params.tipo === "string" ? params.tipo : undefined;
  const categoria = typeof params.categoria === "string" ? params.categoria : undefined;
  const origen = typeof params.origen === "string" ? params.origen : undefined;
  const moneda = typeof params.moneda === "string" ? params.moneda : undefined;
  const desde = typeof params.desde === "string" ? params.desde : undefined;
  const hasta = typeof params.hasta === "string" ? params.hasta : undefined;

  const supabase = await createClient();

  let transactionsQuery = supabase
    .from("transactions")
    .select(`*, category:expense_categories(id, name)`)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (tipo && (TRANSACTION_TYPES as readonly string[]).includes(tipo)) {
    transactionsQuery = transactionsQuery.eq("type", tipo);
  }
  if (categoria) transactionsQuery = transactionsQuery.eq("category_id", categoria);
  if (origen && (TRANSACTION_ORIGINS as readonly string[]).includes(origen)) {
    transactionsQuery = transactionsQuery.eq("origin", origen);
  }
  if (moneda === "ARS" || moneda === "USD") transactionsQuery = transactionsQuery.eq("currency", moneda);
  if (desde) transactionsQuery = transactionsQuery.gte("date", desde);
  if (hasta) transactionsQuery = transactionsQuery.lte("date", hasta);

  const now = new Date();
  const currentMonthKey = monthKey(now);
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    { data: transactionsData },
    { data: categoriesData },
    { data: recurringData },
    { data: summaryData },
  ] = await Promise.all([
    transactionsQuery,
    supabase
      .from("expense_categories")
      .select("id, name, active, created_at")
      .eq("active", true)
      .order("name"),
    supabase
      .from("recurring_expenses")
      .select(
        `*, category:expense_categories(id, name),
         contract:contracts(id, title, client:clients(id, first_name, last_name))`
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("type, amount, currency, date, category_id, category:expense_categories(id, name)")
      .gte("date", dateInputValue(rangeStart)),
  ]);

  const transactions = (transactionsData ?? []) as unknown as TransactionWithRelations[];
  const categories = (categoriesData ?? []) as ExpenseCategory[];
  const recurringExpenses = (recurringData ?? []) as unknown as RecurringExpenseWithRelations[];
  const summaryRows = (summaryData ?? []) as unknown as SummaryRow[];

  const monthBuckets = new Map<string, MonthlyPoint>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = format(d, "MMM yy", { locale: es });
    monthBuckets.set(key, {
      key,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      ingreso: 0,
      egreso: 0,
    });
  }

  let ingresoArs = 0;
  let egresoArs = 0;
  let ingresoUsd = 0;
  let egresoUsd = 0;
  const categoryTotals = new Map<string, CategoryBreakdownItem>();

  for (const row of summaryRows) {
    const rowMonth = row.date.slice(0, 7);
    const bucket = monthBuckets.get(rowMonth);
    if (bucket && row.currency === "ARS") {
      if (row.type === "ingreso") bucket.ingreso += row.amount;
      else bucket.egreso += row.amount;
    }

    if (rowMonth !== currentMonthKey) continue;

    if (row.type === "ingreso") {
      if (row.currency === "ARS") ingresoArs += row.amount;
      else ingresoUsd += row.amount;
    } else {
      if (row.currency === "ARS") egresoArs += row.amount;
      else egresoUsd += row.amount;

      const catId = row.category_id ?? "sin_categoria";
      const catName = row.category?.name ?? "Sin categoría";
      const existing = categoryTotals.get(catId) ?? { id: catId, name: catName, ars: 0, usd: 0 };
      if (row.currency === "ARS") existing.ars += row.amount;
      else existing.usd += row.amount;
      categoryTotals.set(catId, existing);
    }
  }

  const months = Array.from(monthBuckets.values());
  const categoryBreakdown = Array.from(categoryTotals.values()).sort(
    (a, b) => b.ars + b.usd - (a.ars + a.usd)
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
          <p className="text-sm text-muted-foreground">
            Libro de movimientos, gastos y automatización mensual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RecurringExpenseForm
            categories={categories}
            trigger={
              <Button variant="outline" size="sm">
                <Plus />
                Gasto recurrente
              </Button>
            }
          />
          <ManualExpenseForm categories={categories} />
        </div>
      </div>

      <MonthlySummary
        months={months}
        currentMonth={{ ingresoArs, egresoArs, netoArs: ingresoArs - egresoArs, ingresoUsd, egresoUsd }}
        categoryBreakdown={categoryBreakdown}
      />

      <MonthlyReportCard />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Libro de movimientos</h2>
        <TransactionFilters categories={categories} />
        <TransactionsTable transactions={transactions} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Gastos recurrentes</h2>
        <RecurringExpensesList recurringExpenses={recurringExpenses} categories={categories} />
      </div>
    </div>
  );
}
