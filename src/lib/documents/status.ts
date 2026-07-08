import type { Document, DocumentStatus } from "@/lib/types/document";

function todayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// El cron de Fase 8 todavía no existe: mientras tanto, un presupuesto
// "enviado" cuya validez venció se muestra como "vencido" sin mutar la fila.
export function effectiveDocumentStatus(doc: Pick<Document, "status" | "valid_until">): DocumentStatus {
  if (doc.status === "enviado" && doc.valid_until && doc.valid_until < todayDateOnly()) {
    return "vencido";
  }
  return doc.status;
}
