import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentStatus, DocumentType } from "@/lib/types/document";

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  vencido: "Vencido",
};

const STATUS_CLASS: Record<DocumentStatus, string> = {
  borrador: "border-transparent bg-muted text-muted-foreground",
  enviado: "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400",
  aceptado: "border-transparent bg-primary/15 text-primary",
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
