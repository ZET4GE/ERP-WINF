"use client";

import { useTransition } from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { sendManualCuotaReminder } from "@/app/(dashboard)/finanzas/actions";
import type { PendingCharge } from "@/lib/finance/pending-charges";

function StatusBadge({ status, overdueDays }: { status: string; overdueDays: number }) {
  if (status === "vencida" || overdueDays > 0) {
    return <Badge variant="destructive">Vencida{overdueDays > 0 ? ` (${overdueDays}d)` : ""}</Badge>;
  }
  return <Badge variant="secondary">Pendiente</Badge>;
}

function ReminderButton({ charge }: { charge: PendingCharge }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await sendManualCuotaReminder(charge.table, charge.id);
      if (result?.error) toast.error(result.error);
      else toast.success(`Recordatorio enviado a ${charge.clientName}`);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending || !charge.phone}
      title={!charge.phone ? "El cliente no tiene teléfono cargado" : undefined}
    >
      <MessageCircle />
      {isPending ? "Enviando..." : "Recordar"}
    </Button>
  );
}

export function PendingChargesTable({ charges }: { charges: PendingCharge[] }) {
  if (charges.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No hay cuotas pendientes de pago"
        description="Cuando una cuota o cargo de suscripción quede pendiente o vencido, vas a verlo acá con la opción de mandar un recordatorio manual por WhatsApp."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Concepto</TableHead>
          <TableHead>Vence</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {charges.map((charge) => (
          <TableRow key={`${charge.table}:${charge.id}`}>
            <TableCell className="font-medium">{charge.clientName}</TableCell>
            <TableCell className="text-muted-foreground">{charge.description}</TableCell>
            <TableCell className="whitespace-nowrap">{formatDate(charge.dueDate)}</TableCell>
            <TableCell className="whitespace-nowrap">
              {formatCurrency(charge.amount, charge.currency)}
            </TableCell>
            <TableCell>
              <StatusBadge status={charge.status} overdueDays={charge.overdueDays} />
            </TableCell>
            <TableCell className="text-right">
              <ReminderButton charge={charge} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
