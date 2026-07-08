import { createClient } from "@/lib/supabase/server";
import type { TransactionWithRelations } from "@/lib/types/finance";

export interface MonthlyCategoryTotal {
  name: string;
  ars: number;
  usd: number;
}

export interface MonthlyReportData {
  month: string;
  transactions: TransactionWithRelations[];
  ingresoArs: number;
  egresoArs: number;
  netoArs: number;
  ingresoUsd: number;
  egresoUsd: number;
  netoUsd: number;
  categoryBreakdown: MonthlyCategoryTotal[];
}

function nextMonth(month: string) {
  const [year, monthNum] = month.split("-").map(Number);
  const d = new Date(year, monthNum, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function loadMonthlyReportData(month: string): Promise<MonthlyReportData> {
  const supabase = await createClient();
  const start = `${month}-01`;
  const end = nextMonth(month);

  const { data } = await supabase
    .from("transactions")
    .select(`*, category:expense_categories(id, name)`)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: true });

  const transactions = (data ?? []) as unknown as TransactionWithRelations[];

  let ingresoArs = 0;
  let egresoArs = 0;
  let ingresoUsd = 0;
  let egresoUsd = 0;
  const categoryTotals = new Map<string, MonthlyCategoryTotal>();

  for (const t of transactions) {
    if (t.type === "ingreso") {
      if (t.currency === "ARS") ingresoArs += t.amount;
      else ingresoUsd += t.amount;
    } else {
      if (t.currency === "ARS") egresoArs += t.amount;
      else egresoUsd += t.amount;

      const name = t.category?.name ?? "Sin categoría";
      const existing = categoryTotals.get(name) ?? { name, ars: 0, usd: 0 };
      if (t.currency === "ARS") existing.ars += t.amount;
      else existing.usd += t.amount;
      categoryTotals.set(name, existing);
    }
  }

  return {
    month,
    transactions,
    ingresoArs,
    egresoArs,
    netoArs: ingresoArs - egresoArs,
    ingresoUsd,
    egresoUsd,
    netoUsd: ingresoUsd - egresoUsd,
    categoryBreakdown: Array.from(categoryTotals.values()).sort(
      (a, b) => b.ars + b.usd - (a.ars + a.usd)
    ),
  };
}
