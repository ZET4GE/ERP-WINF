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
  soporte: "bg-sky-500",
  relevamiento: "bg-amber-500",
  mantenimiento: "bg-violet-500",
};

const TYPE_BADGE_CLASS: Record<AppointmentType, string> = {
  instalacion: "border-transparent bg-primary/15 text-primary",
  soporte: "border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400",
  relevamiento: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  mantenimiento: "border-transparent bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

export function AppointmentTypeBadge({ type }: { type: AppointmentType }) {
  return (
    <Badge className={cn(TYPE_BADGE_CLASS[type])} variant="outline">
      {TYPE_LABEL[type]}
    </Badge>
  );
}
