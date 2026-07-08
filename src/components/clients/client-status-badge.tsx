import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/lib/types/client";

const STATUS_LABEL: Record<ClientStatus, string> = {
  activo: "Activo",
  moroso: "Moroso",
  potencial: "Potencial",
  inactivo: "Inactivo",
};

const STATUS_CLASS: Record<ClientStatus, string> = {
  activo: "border-transparent bg-primary/15 text-primary",
  moroso: "border-transparent bg-destructive/15 text-destructive",
  potencial: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  inactivo: "border-transparent bg-muted text-muted-foreground",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])} variant="outline">
      {STATUS_LABEL[status]}
    </Badge>
  );
}
