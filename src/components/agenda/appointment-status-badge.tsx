import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/types/appointment";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  pendiente: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  confirmado: "border-transparent bg-primary/15 text-primary",
  completado: "border-transparent bg-muted text-muted-foreground",
  cancelado: "border-transparent bg-destructive/15 text-destructive",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])} variant="outline">
      {STATUS_LABEL[status]}
    </Badge>
  );
}
