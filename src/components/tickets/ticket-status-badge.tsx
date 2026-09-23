import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types/ticket";

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  abierto: "border-transparent bg-info/15 text-info",
  en_proceso: "border-transparent bg-warning/15 text-warning",
  resuelto: "border-transparent bg-primary/15 text-primary",
  cerrado: "border-transparent bg-muted text-muted-foreground",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])} variant="outline">
      {TICKET_STATUS_LABEL[status]}
    </Badge>
  );
}
