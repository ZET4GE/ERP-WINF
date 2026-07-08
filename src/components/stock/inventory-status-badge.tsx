import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InventoryStatus } from "@/lib/types/inventory";

export const INVENTORY_STATUS_LABEL: Record<InventoryStatus, string> = {
  en_stock: "En stock",
  asignado: "Asignado",
  instalado: "Instalado",
  rma: "RMA",
  baja: "Baja",
};

const STATUS_CLASS: Record<InventoryStatus, string> = {
  en_stock: "border-transparent bg-primary/15 text-primary",
  asignado: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  instalado: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rma: "border-transparent bg-orange-500/15 text-orange-600 dark:text-orange-400",
  baja: "border-transparent bg-destructive/15 text-destructive",
};

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])} variant="outline">
      {INVENTORY_STATUS_LABEL[status]}
    </Badge>
  );
}
