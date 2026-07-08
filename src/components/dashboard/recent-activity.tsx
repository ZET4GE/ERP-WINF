import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Receipt, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  kind: "pago" | "contrato" | "documento";
  title: string;
  subtitle?: string;
  date: string;
  href: string;
}

const KIND_ICON = {
  pago: TrendingUp,
  contrato: FileText,
  documento: Receipt,
} as const;

const KIND_CLASS = {
  pago: "bg-primary/15 text-primary",
  contrato: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  documento: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
} as const;

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos recientes.</p>
        ) : (
          items.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <Link
                key={`${item.kind}-${item.id}`}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", KIND_CLASS[item.kind])}>
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{item.title}</span>
                  {item.subtitle && (
                    <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format(new Date(item.date), "dd/MM/yyyy", { locale: es })}
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
