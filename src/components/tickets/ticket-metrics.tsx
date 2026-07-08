import Link from "next/link";
import { Clock, LifeBuoy, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";

export interface TicketTopClient {
  clientId: string;
  name: string;
  count: number;
}

export function TicketMetrics({
  openCount,
  thisMonthCount,
  avgResolutionMinutes,
  topClients,
}: {
  openCount: number;
  thisMonthCount: number;
  avgResolutionMinutes: number | null;
  topClients: TicketTopClient[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <KpiCard
        title="Tickets abiertos"
        value={String(openCount)}
        icon={LifeBuoy}
        accent={openCount > 0}
      />
      <KpiCard title="Tickets este mes" value={String(thisMonthCount)} icon={TrendingUp} />
      <KpiCard
        title="Tiempo promedio de resolución"
        value={
          avgResolutionMinutes != null
            ? avgResolutionMinutes >= 60
              ? `${(avgResolutionMinutes / 60).toFixed(1)} h`
              : `${Math.round(avgResolutionMinutes)} min`
            : "—"
        }
        icon={Clock}
        hint="Sobre tickets resueltos/cerrados"
      />
      <Card className="gap-2 py-5">
        <CardHeader className="flex-row items-center justify-between space-y-0 px-5">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Clientes con más tickets
          </CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="flex flex-col gap-1 px-5">
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
          ) : (
            topClients.map((client) => (
              <Link
                key={client.clientId}
                href={`/clientes/${client.clientId}`}
                className="flex items-center justify-between text-sm hover:text-primary hover:underline"
              >
                <span className="truncate">{client.name}</span>
                <span className="text-xs text-muted-foreground">{client.count}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
