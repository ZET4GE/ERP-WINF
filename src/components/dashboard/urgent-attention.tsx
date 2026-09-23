import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TicketPriority } from "@/lib/types/ticket";

export interface AttentionItem {
  id: string;
  title: string;
  subtitle?: string;
  priority: TicketPriority;
  href: string;
}

const PRIORITY_DOT_CLASS: Record<TicketPriority, string> = {
  urgente: "bg-destructive",
  alta: "bg-warning",
  media: "bg-primary",
  baja: "bg-muted-foreground",
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function UrgentAttention({ items }: { items: AttentionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Atención inmediata</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Todo al día"
            description="No hay tickets abiertos que requieran atención urgente."
          />
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
            >
              <span className="relative flex size-2.5 shrink-0">
                {item.priority === "urgente" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                )}
                <span className={cn("relative inline-flex size-2.5 rounded-full", PRIORITY_DOT_CLASS[item.priority])} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{item.title}</span>
                {item.subtitle && (
                  <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {PRIORITY_LABEL[item.priority]}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
