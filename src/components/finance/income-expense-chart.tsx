"use client";

import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
const COLORS = {
  light: { ingreso: "#13B5A6", egreso: "#E34948" },
  dark: { ingreso: "#0E9C8F", egreso: "#E05C5C" },
};

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
}: {
  title: string;
  months: MonthlyPoint[];
}) {
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80 px-2 sm:px-5">
        <ResponsiveContainer width="100%" height="100%">
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
            <Bar dataKey="ingreso" name="Ingresos" fill={colors.ingreso} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="egreso" name="Egresos" fill={colors.egreso} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
