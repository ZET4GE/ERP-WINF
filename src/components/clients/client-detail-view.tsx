"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  FileText,
  History,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EmptyState } from "@/components/empty-state";
import { ClientMiniMap } from "@/components/clients/client-mini-map";
import { ContractsTable } from "@/components/contracts/contracts-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryStatusBadge } from "@/components/stock/inventory-status-badge";
import { InventoryHistoryDialog } from "@/components/stock/inventory-history-dialog";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import { AppointmentForm } from "@/components/agenda/appointment-form";
import { TicketForm } from "@/components/tickets/ticket-form";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { formatDate } from "@/lib/format";
import { whatsAppLink } from "@/lib/phone";
import {
  CLIENT_STATUSES,
  type Client,
  type ClientStatus,
} from "@/lib/types/client";
import type { ContractWithRelations } from "@/lib/types/contract";
import type { InventoryItemWithProduct } from "@/lib/types/inventory";
import type { AppointmentWithRelations } from "@/lib/types/appointment";
import type { TicketWithRelations } from "@/lib/types/ticket";
import {
  changeClientStatus,
  deleteClientRecord,
} from "@/app/(dashboard)/clientes/actions";

const STATUS_LABEL: Record<ClientStatus, string> = {
  activo: "Activo",
  moroso: "Moroso",
  potencial: "Potencial",
  inactivo: "Inactivo",
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function ClientDetailView({
  client,
  contracts,
  inventoryItems,
  appointments,
  technicians,
  tickets,
}: {
  client: Client;
  contracts: ContractWithRelations[];
  inventoryItems: InventoryItemWithProduct[];
  appointments: AppointmentWithRelations[];
  technicians: { id: string; full_name: string }[];
  tickets: TicketWithRelations[];
}) {
  const [isPending, startTransition] = useTransition();
  const [historyItem, setHistoryItem] = useState<InventoryItemWithProduct>();

  const fullName = `${client.first_name} ${client.last_name}`;

  function handleStatusChange(status: ClientStatus) {
    startTransition(async () => {
      const result = await changeClientStatus(client.id, status);
      if (result?.error) toast.error(result.error);
      else toast.success("Estado actualizado");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClientRecord(client.id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {fullName}
            </h1>
          </div>
          {client.business_name && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="size-3.5" />
              {client.business_name}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={client.status}
            onValueChange={(v) => handleStatusChange(v as ClientStatus)}
          >
            <SelectTrigger className="w-40" disabled={isPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" render={<Link href={`/clientes/${client.id}/editar`} />}>
            <Pencil />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              <Trash2 />
              Eliminar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar a {fullName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Si el cliente tiene contratos asociados se ocultará del
                  listado en lugar de borrarse definitivamente. Esta acción no
                  se puede deshacer desde la interfaz.
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

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="equipos">Equipos asignados</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Datos del cliente</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoRow label="DNI" value={client.dni} />
                  <InfoRow label="CUIT/CUIL" value={client.cuit_cuil} />
                  <InfoRow label="Email" value={client.email} />
                  <InfoRow label="Teléfono" value={client.phone} />
                  <InfoRow label="Provincia" value={client.province} />
                  <InfoRow label="Localidad" value={client.city} />
                </div>
                <InfoRow label="Dirección" value={client.address} />
                {client.internal_notes && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      Notas internas
                    </span>
                    <p className="text-sm">{client.internal_notes}</p>
                  </div>
                )}
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Cliente desde {formatDate(client.created_at)}
                </p>

                <div className="flex flex-wrap gap-2">
                  {client.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <a
                          href={whatsAppLink(client.phone)}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <MessageCircle />
                      WhatsApp
                    </Button>
                  )}
                  {client.lat != null && client.lng != null && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <a
                          href={`https://www.google.com/maps?q=${client.lat},${client.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <MapPin />
                      Abrir en Google Maps
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Ubicación</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientMiniMap lat={client.lat} lng={client.lng} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contratos" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              render={<Link href={`/contratos/nuevo?client_id=${client.id}`} />}
            >
              <Receipt />
              Nuevo contrato
            </Button>
          </div>
          {contracts.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Sin contratos todavía"
              description="Los contratos de este cliente van a aparecer acá cuando se cargue el primero."
            />
          ) : (
            <ContractsTable contracts={contracts} />
          )}
        </TabsContent>

        <TabsContent value="equipos" className="mt-4">
          {inventoryItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Sin equipos asignados"
              description="El equipamiento asignado a este cliente va a aparecer acá."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S/N</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.serial_number}</TableCell>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>
                        <InventoryStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Historial"
                          onClick={() => setHistoryItem(item)}
                        >
                          <History className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <EmptyState
            icon={FileText}
            title="Sin documentos"
            description="Presupuestos, contratos y facturas del cliente van a listarse acá cuando esté listo el módulo de Documentos."
          />
        </TabsContent>

        <TabsContent value="turnos" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <AppointmentForm
              initialClient={{
                id: client.id,
                first_name: client.first_name,
                last_name: client.last_name,
                business_name: client.business_name,
                phone: client.phone,
                address: client.address,
              }}
              technicians={technicians}
              existingAppointments={appointments.map((a) => ({
                id: a.id,
                start_at: a.start_at,
                end_at: a.end_at,
                status: a.status,
                label: `${a.client.first_name} ${a.client.last_name}`,
              }))}
            />
          </div>
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Sin turnos programados"
              description="Los turnos de instalación y mantenimiento de este cliente van a aparecer acá."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  technicians={technicians}
                  existingAppointments={appointments
                    .filter((a) => a.id !== appointment.id)
                    .map((a) => ({
                      id: a.id,
                      start_at: a.start_at,
                      end_at: a.end_at,
                      status: a.status,
                      label: `${a.client.first_name} ${a.client.last_name}`,
                    }))}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tickets" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <TicketForm
              initialClient={{
                id: client.id,
                first_name: client.first_name,
                last_name: client.last_name,
                business_name: client.business_name,
              }}
            />
          </div>
          {tickets.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Sin tickets todavía"
              description="Los tickets de soporte de este cliente van a aparecer acá."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asunto</TableHead>
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
                        <TicketPriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell>
                        <TicketStatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(ticket.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <EmptyState
            icon={ArrowLeftRight}
            title="Sin movimientos"
            description="El historial de pagos y movimientos del cliente va a aparecer acá cuando esté listo el módulo de Finanzas."
          />
        </TabsContent>
      </Tabs>

      {historyItem && (
        <InventoryHistoryDialog
          open={!!historyItem}
          onOpenChange={(v) => !v && setHistoryItem(undefined)}
          itemId={historyItem.id}
          serialNumber={historyItem.serial_number}
        />
      )}
    </div>
  );
}
