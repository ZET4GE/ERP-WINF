"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export interface CollectionDonutDatum {
  label: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: CollectionDonutDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="flex items-center gap-1.5" style={{ color: entry.payload.color }}>
        {entry.name}: {formatCurrency(entry.value, "ARS")}
      </p>
    </div>
  );
}

export function CollectionDonut({
  data,
  totalLabel,
}: {
  data: CollectionDonutDatum[];
  totalLabel?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cobranza del mes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="relative h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="65%"
                outerRadius="90%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-xl font-semibold">{formatCurrency(total, "ARS")}</span>
            <span className="text-xs text-muted-foreground">{totalLabel ?? "Total del mes"}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {data.map((entry) => (
            <span key={entry.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
