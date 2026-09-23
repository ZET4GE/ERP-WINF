import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContractStatus } from "@/lib/types/contract";

const STATUS_LABEL: Record<ContractStatus, string> = {
  activo: "Activo",
  pausado: "Pausado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<ContractStatus, string> = {
  activo: "border-transparent bg-primary/15 text-primary",
  pausado: "border-transparent bg-warning/15 text-warning",
  finalizado: "border-transparent bg-muted text-muted-foreground",
  cancelado: "border-transparent bg-destructive/15 text-destructive",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])} variant="outline">
      {STATUS_LABEL[status]}
    </Badge>
  );
}
