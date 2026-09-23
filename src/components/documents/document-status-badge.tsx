import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentStatus, DocumentType } from "@/lib/types/document";

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  cancelado: "Cancelado",
  vencido: "Vencido",
};

const STATUS_CLASS: Record<DocumentStatus, string> = {
  borrador: "border-transparent bg-muted text-muted-foreground",
  enviado: "border-transparent bg-info/15 text-info",
  aceptado: "border-transparent bg-primary/15 text-primary",
  cancelado: "border-transparent bg-muted text-muted-foreground line-through",
  vencido: "border-transparent bg-destructive/15 text-destructive",
};

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  presupuesto: "Presupuesto",
  informe_tecnico: "Informe técnico",
  remito_ot: "Remito / OT",
  comprobante: "Comprobante",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge className={cn(STATUS_CLASS[status])} variant="outline">
      {DOCUMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
