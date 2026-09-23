"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export interface MonthlyPoint {
  key: string;
  label: string;
  ingreso: number;
  egreso: number;
}

// Paleta validada (colorblind-safe, contraste >= 3:1) — ver skill dataviz.
const COLORS = { ingreso: "#00C8E0", egreso: "#2A4A6B", neto: "#4DDCEF" };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, "ARS")}
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({
  title,
  months,
  variant = "bars",
}: {
  title: string;
  months: MonthlyPoint[];
  variant?: "bars" | "area";
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-80 flex-1 px-2 sm:px-5">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "area" ? (
            <ComposedChart data={months.map((m) => ({ ...m, neto: m.ingreso - m.egreso }))}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={56}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("es-AR", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(value)
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)" }} />
              <Legend
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="ingreso"
                name="Ingresos"
                stroke={COLORS.ingreso}
                fill={COLORS.ingreso}
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="egreso"
                name="Egresos"
                stroke={COLORS.egreso}
                fill={COLORS.egreso}
                fillOpacity={0.2}
              />
              <Line
                type="monotone"
                dataKey="neto"
                name="Neto"
                stroke={COLORS.neto}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          ) : (
            <BarChart data={months} barGap={2} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={56}
                stroke="var(--color-muted-foreground)"
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat("es-AR", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(value)
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)" }} />
              <Legend
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
              <Bar dataKey="ingreso" name="Ingresos" fill={COLORS.ingreso} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="egreso" name="Egresos" fill={COLORS.egreso} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
