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
  asignado: "border-transparent bg-warning/15 text-warning",
  instalado: "border-transparent bg-success/15 text-success",
  rma: "border-transparent bg-warning/15 text-warning",
  baja: "border-transparent bg-destructive/15 text-destructive",
};

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])} variant="outline">
      {INVENTORY_STATUS_LABEL[status]}
    </Badge>
  );
}
