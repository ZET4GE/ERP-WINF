import Link from "next/link";
import { FileText } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { DocumentStatusBadge, DOCUMENT_TYPE_LABEL } from "@/components/documents/document-status-badge";
import { effectiveDocumentStatus } from "@/lib/documents/status";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DocumentWithRelations } from "@/lib/types/document";

export function DocumentsTable({ documents }: { documents: DocumentWithRelations[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No se encontraron documentos"
        description="Probá ajustar la búsqueda o los filtros, o cargá un nuevo documento."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Emisión</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <Link
                  href={`/documentos/${doc.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {doc.number}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {DOCUMENT_TYPE_LABEL[doc.doc_type]}
              </TableCell>
              <TableCell>
                {doc.client ? (
                  <>
                    {doc.client.first_name} {doc.client.last_name}
                    {doc.client.business_name && (
                      <p className="text-xs text-muted-foreground">{doc.client.business_name}</p>
                    )}
                  </>
                ) : (
                  doc.manual_client_name ?? "—"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(doc.issued_at)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatCurrency(doc.total, doc.currency)}
              </TableCell>
              <TableCell>
                <DocumentStatusBadge status={effectiveDocumentStatus(doc)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
