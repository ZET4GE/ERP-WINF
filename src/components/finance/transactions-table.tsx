"use client";

import { useTransition } from "react";
import { BookOpen, Paperclip } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { TransactionTypeBadge } from "@/components/finance/transaction-type-badge";
import { getReceiptUrl } from "@/app/(dashboard)/finanzas/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTION_ORIGIN_LABEL } from "@/lib/finance/labels";
import type { TransactionWithRelations } from "@/lib/types/finance";

function AttachmentLink({ path }: { path: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await getReceiptUrl(path);
      if (result.error || !result.url) {
        toast.error(result.error ?? "No se pudo abrir el adjunto");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleClick} disabled={isPending} title="Ver adjunto">
      <Paperclip />
    </Button>
  );
}

export function TransactionsTable({ transactions }: { transactions: TransactionWithRelations[] }) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No hay movimientos"
        description="Probá ajustar los filtros o cargá un gasto manual."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Adjunto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="text-muted-foreground">{formatDate(tx.date)}</TableCell>
              <TableCell>
                <TransactionTypeBadge type={tx.type} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {TRANSACTION_ORIGIN_LABEL[tx.origin]}
              </TableCell>
              <TableCell className="text-muted-foreground">{tx.category?.name ?? "—"}</TableCell>
              <TableCell className="max-w-72 truncate" title={tx.description ?? undefined}>
                {tx.description ?? "—"}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  tx.type === "ingreso" ? "text-primary" : "text-destructive"
                }`}
              >
                {tx.type === "egreso" ? "-" : ""}
                {formatCurrency(tx.amount, tx.currency)}
              </TableCell>
              <TableCell className="text-right">
                {tx.attachment_url ? (
                  <AttachmentLink path={tx.attachment_url} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
