import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { formatDate } from "@/lib/format";
import type { TicketWithRelations } from "@/lib/types/ticket";

export function TicketsTable({ tickets }: { tickets: TicketWithRelations[] }) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={LifeBuoy}
        title="No se encontraron tickets"
        description="Probá ajustar la búsqueda o los filtros, o cargá un nuevo ticket."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asunto</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Equipo</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {ticket.subject}
                </Link>
              </TableCell>
              <TableCell>
                {ticket.client ? (
                  <>
                    {ticket.client.first_name} {ticket.client.last_name}
                    {ticket.client.business_name && (
                      <p className="text-xs text-muted-foreground">{ticket.client.business_name}</p>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {ticket.inventory_item
                  ? `${ticket.inventory_item.product.name} — ${ticket.inventory_item.serial_number}`
                  : "—"}
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(ticket.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
