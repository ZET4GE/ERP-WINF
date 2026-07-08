import { MessageCircle } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export interface ReminderLogRow {
  id: string;
  type: "turno" | "cuota";
  status: "enviado" | "error" | "sin_telefono" | "sin_configurar";
  message: string | null;
  error_message: string | null;
  created_at: string;
  client: { first_name: string; last_name: string; business_name: string | null } | null;
}

const TYPE_LABEL: Record<ReminderLogRow["type"], string> = {
  turno: "Turno",
  cuota: "Cuota",
};

const STATUS_BADGE: Record<ReminderLogRow["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  enviado: { label: "Enviado", variant: "default" },
  error: { label: "Error", variant: "destructive" },
  sin_telefono: { label: "Sin teléfono", variant: "outline" },
  sin_configurar: { label: "Sin configurar", variant: "secondary" },
};

function clientLabel(client: ReminderLogRow["client"]) {
  if (!client) return "—";
  return client.business_name || `${client.first_name} ${client.last_name}`;
}

export function RemindersLog({ reminders }: { reminders: ReminderLogRow[] }) {
  if (reminders.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Todavía no se envió ningún recordatorio"
        description="Acá vas a ver el historial de recordatorios automáticos de turnos y cuotas por WhatsApp una vez que corra el cron diario."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Mensaje</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reminders.map((r) => {
          const badge = STATUS_BADGE[r.status];
          return (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(r.created_at)}
              </TableCell>
              <TableCell>{TYPE_LABEL[r.type]}</TableCell>
              <TableCell className="font-medium">{clientLabel(r.client)}</TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground" title={r.message ?? r.error_message ?? undefined}>
                {r.message ?? r.error_message ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
