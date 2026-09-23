import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppointmentType } from "@/lib/types/appointment";

export const TYPE_LABEL: Record<AppointmentType, string> = {
  instalacion: "Instalación",
  soporte: "Soporte",
  relevamiento: "Relevamiento",
  mantenimiento: "Mantenimiento",
};

export const TYPE_DOT_CLASS: Record<AppointmentType, string> = {
  instalacion: "bg-primary",
  soporte: "bg-info",
  relevamiento: "bg-warning",
  mantenimiento: "bg-success",
};

const TYPE_BADGE_CLASS: Record<AppointmentType, string> = {
  instalacion: "border-transparent bg-primary/15 text-primary",
  soporte: "border-transparent bg-info/15 text-info",
  relevamiento: "border-transparent bg-warning/15 text-warning",
  mantenimiento: "border-transparent bg-success/15 text-success",
};

export function AppointmentTypeBadge({ type }: { type: AppointmentType }) {
  return (
    <Badge className={cn(TYPE_BADGE_CLASS[type])} variant="outline">
      {TYPE_LABEL[type]}
    </Badge>
  );
}
