"use client";

import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { IncomeExpenseChart, type MonthlyPoint } from "@/components/finance/income-expense-chart";

export type { MonthlyPoint };

export interface CategoryBreakdownItem {
  id: string;
  name: string;
  ars: number;
  usd: number;
}

export interface CurrentMonthSummary {
  ingresoArs: number;
  egresoArs: number;
  netoArs: number;
  ingresoUsd: number;
  egresoUsd: number;
}

export function MonthlySummary({
  months,
  currentMonth,
  categoryBreakdown,
}: {
  months: MonthlyPoint[];
  currentMonth: CurrentMonthSummary;
  categoryBreakdown: CategoryBreakdownItem[];
}) {
  const maxCategoryAmount = Math.max(1, ...categoryBreakdown.map((c) => c.ars));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          title="Ingresos del mes"
          value={formatCurrency(currentMonth.ingresoArs, "ARS")}
          icon={TrendingUp}
          hint={
            currentMonth.ingresoUsd > 0
              ? `+ ${formatCurrency(currentMonth.ingresoUsd, "USD")}`
              : undefined
          }
        />
        <KpiCard
          title="Egresos del mes"
          value={formatCurrency(currentMonth.egresoArs, "ARS")}
          icon={TrendingDown}
          hint={
            currentMonth.egresoUsd > 0
              ? `+ ${formatCurrency(currentMonth.egresoUsd, "USD")}`
              : undefined
          }
        />
        <KpiCard
          title="Resultado neto"
          value={formatCurrency(currentMonth.netoArs, "ARS")}
          icon={Wallet}
          accent={currentMonth.netoArs >= 0}
          hint="Ingresos - egresos (ARS), mes actual"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeExpenseChart title="Ingresos vs egresos — últimos 12 meses" months={months} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Egresos por categoría (este mes)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin egresos este mes.</p>
            ) : (
              categoryBreakdown.map((category) => (
                <div key={category.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{category.name}</span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(category.ars, "ARS")}
                      {category.usd > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          + {formatCurrency(category.usd, "USD")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/70"
                      style={{ width: `${Math.round((category.ars / maxCategoryAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
