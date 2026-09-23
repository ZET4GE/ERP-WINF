import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TicketPriority } from "@/lib/types/ticket";

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_CLASS: Record<TicketPriority, string> = {
  baja: "border-transparent bg-muted text-muted-foreground",
  media: "border-transparent bg-info/15 text-info",
  alta: "border-transparent bg-warning/15 text-warning",
  urgente: "border-transparent bg-destructive/15 text-destructive",
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge className={cn(PRIORITY_CLASS[priority])} variant="outline">
      {TICKET_PRIORITY_LABEL[priority]}
    </Badge>
  );
}
