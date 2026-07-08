"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Download, Eye, FileSignature, Pencil, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  DocumentStatusBadge,
} from "@/components/documents/document-status-badge";
import { effectiveDocumentStatus } from "@/lib/documents/status";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  changeDocumentStatus,
  convertDocumentToContract,
  renderDocumentPdf,
  saveDocumentPdfToStorage,
} from "@/app/(dashboard)/documentos/actions";
import { DOCUMENT_STATUSES, type DocumentStatus, type DocumentWithRelations } from "@/lib/types/document";

function base64ToBlob(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}

export function DocumentDetailView({ document }: { document: DocumentWithRelations }) {
  const [isStatusPending, startStatusTransition] = useTransition();
  const [isPdfPending, startPdfTransition] = useTransition();
  const [isSavePending, startSaveTransition] = useTransition();
  const [isConvertPending, startConvertTransition] = useTransition();

  const status = effectiveDocumentStatus(document);

  function handleStatusChange(newStatus: DocumentStatus) {
    startStatusTransition(async () => {
      const result = await changeDocumentStatus(document.id, newStatus);
      if (result?.error) toast.error(result.error);
      else toast.success("Estado actualizado");
    });
  }

  function handleView() {
    startPdfTransition(async () => {
      const result = await renderDocumentPdf(document.id);
      if (result.error || !result.base64) {
        toast.error(result.error ?? "No se pudo generar el PDF");
        return;
      }
      const url = URL.createObjectURL(base64ToBlob(result.base64));
      window.open(url, "_blank");
    });
  }

  function handleDownload() {
    startPdfTransition(async () => {
      const result = await renderDocumentPdf(document.id);
      if (result.error || !result.base64) {
        toast.error(result.error ?? "No se pudo generar el PDF");
        return;
      }
      const url = URL.createObjectURL(base64ToBlob(result.base64));
      const a = globalThis.document.createElement("a");
      a.href = url;
      a.download = result.filename ?? `${document.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleSaveToStorage() {
    startSaveTransition(async () => {
      const result = await saveDocumentPdfToStorage(document.id);
      if (result?.error) toast.error(result.error);
      else toast.success("PDF guardado en Storage");
    });
  }

  function handleConvert() {
    startConvertTransition(async () => {
      const result = await convertDocumentToContract(document.id);
      if (result?.error) toast.error(result.error);
    });
  }

  const clientName = document.client
    ? `${document.client.first_name} ${document.client.last_name}`
    : document.manual_client_name ?? "Sin cliente";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{DOCUMENT_TYPE_LABEL[document.doc_type]}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{document.number}</h1>
          <p className="text-sm text-muted-foreground">
            {clientName}
            {document.client?.business_name && ` (${document.client.business_name})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DocumentStatusBadge status={status} />
          <Select value={status} onValueChange={(v) => handleStatusChange(v as DocumentStatus)}>
            <SelectTrigger className="w-36" disabled={isStatusPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {DOCUMENT_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={isPdfPending} onClick={handleView}>
          <Eye className="size-4" />
          Ver PDF
        </Button>
        <Button variant="outline" disabled={isPdfPending} onClick={handleDownload}>
          <Download className="size-4" />
          Descargar
        </Button>
        <Button variant="outline" disabled={isSavePending} onClick={handleSaveToStorage}>
          <Save className="size-4" />
          Guardar copia en Storage
        </Button>
        {document.status === "borrador" && (
          <Button variant="outline" render={<Link href={`/documentos/${document.id}/editar`} />}>
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
        {document.doc_type === "presupuesto" && (
          <Button disabled={isConvertPending} onClick={handleConvert}>
            <FileSignature className="size-4" />
            Convertir en contrato
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm">
          <div>
            <p className="text-muted-foreground">Fecha de emisión</p>
            <p className="font-medium">{formatDate(document.issued_at)}</p>
          </div>
          {document.valid_until && (
            <div>
              <p className="text-muted-foreground">Válido hasta</p>
              <p className="font-medium">{formatDate(document.valid_until)}</p>
            </div>
          )}
          {document.manual_client_contact && (
            <div>
              <p className="text-muted-foreground">Contacto</p>
              <p className="font-medium">{document.manual_client_contact}</p>
            </div>
          )}
          {document.manual_client_address && (
            <div>
              <p className="text-muted-foreground">Dirección</p>
              <p className="font-medium">{document.manual_client_address}</p>
            </div>
          )}
          {document.contract && (
            <div>
              <p className="text-muted-foreground">Contrato asociado</p>
              <Link
                href={`/contratos/${document.contract.id}`}
                className="font-medium hover:underline"
              >
                {document.contract.title}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {document.doc_type === "informe_tecnico" ? (
        <Card>
          <CardContent className="pt-6">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: document.body ?? "" }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_price, document.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.quantity * item.unit_price, document.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <p className="text-lg font-semibold">
                Total: {formatCurrency(document.total, document.currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {document.notes && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">{document.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
