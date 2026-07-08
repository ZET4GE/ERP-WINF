"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Building2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { TicketStatusBadge, TICKET_STATUS_LABEL } from "@/components/tickets/ticket-status-badge";
import { TicketForm } from "@/components/tickets/ticket-form";
import { ResolveTicketDialog } from "@/components/tickets/resolve-ticket-dialog";
import { TicketTimeline } from "@/components/tickets/ticket-timeline";
import { changeTicketStatus, deleteTicket } from "@/app/(dashboard)/tickets/actions";
import { formatDateTime } from "@/lib/format";
import { TICKET_STATUSES, type TicketStatus, type TicketWithRelations, type TicketUpdateWithAuthor } from "@/lib/types/ticket";

export function TicketDetailView({
  ticket,
  updates,
}: {
  ticket: TicketWithRelations;
  updates: TicketUpdateWithAuthor[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(status: TicketStatus) {
    startTransition(async () => {
      const result = await changeTicketStatus(ticket.id, status);
      if (result?.error) toast.error(result.error);
      else toast.success("Estado actualizado");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTicket(ticket.id);
      if (result?.error) toast.error(result.error);
    });
  }

  const isResolved = ticket.status === "resuelto" || ticket.status === "cerrado";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
          {ticket.client && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              <Link href={`/clientes/${ticket.client.id}`} className="hover:text-primary hover:underline">
                {ticket.client.first_name} {ticket.client.last_name}
                {ticket.client.business_name && ` (${ticket.client.business_name})`}
              </Link>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
            <SelectTrigger className="w-40" disabled={isPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {TICKET_STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isResolved && <ResolveTicketDialog ticket={ticket} />}

          <TicketForm
            ticket={ticket}
            initialClient={ticket.client ?? undefined}
            trigger={
              <Button variant="outline">
                <Pencil />
                Editar
              </Button>
            }
          />

          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              <Trash2 />
              Eliminar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este ticket?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Detalle</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketStatusBadge status={ticket.status} />
            </div>

            {ticket.description && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Descripción</span>
                <p className="text-sm">{ticket.description}</p>
              </div>
            )}

            {ticket.inventory_item && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Equipo relacionado</span>
                <p className="text-sm">
                  {ticket.inventory_item.product.name} — {ticket.inventory_item.serial_number}
                </p>
              </div>
            )}

            <Separator />

            <p className="text-xs text-muted-foreground">
              Creado el {formatDateTime(ticket.created_at)}
            </p>

            {isResolved && ticket.solution_applied && (
              <>
                <Separator />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">Solución aplicada</span>
                  <p className="text-sm">{ticket.solution_applied}</p>
                </div>
                {ticket.time_spent_minutes != null && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Tiempo invertido</span>
                    <p className="text-sm">{ticket.time_spent_minutes} minutos</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <TicketTimeline ticketId={ticket.id} updates={updates} />
        </div>
      </div>
    </div>
  );
}
