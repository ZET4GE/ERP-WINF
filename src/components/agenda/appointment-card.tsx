"use client";

import { useTransition } from "react";
import { MapPin, Pencil, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentForm } from "@/components/agenda/appointment-form";
import { AppointmentTypeBadge } from "@/components/agenda/appointment-type-badge";
import { STATUS_LABEL } from "@/components/agenda/appointment-status-badge";
import { WhatsAppConfirmDialog } from "@/components/agenda/whatsapp-confirm-dialog";
import { changeAppointmentStatus } from "@/app/(dashboard)/agenda/actions";
import { formatTime } from "@/lib/format";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
  type AppointmentWithRelations,
} from "@/lib/types/appointment";

type OverlapCandidate = {
  id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  label: string;
};

export function AppointmentCard({
  appointment,
  technicians,
  existingAppointments,
}: {
  appointment: AppointmentWithRelations;
  technicians: { id: string; full_name: string }[];
  existingAppointments: OverlapCandidate[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(status: AppointmentStatus) {
    startTransition(async () => {
      const result = await changeAppointmentStatus(appointment.id, status);
      if (result?.error) toast.error(result.error);
      else toast.success("Estado actualizado");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <AppointmentTypeBadge type={appointment.type} />
          <span className="text-sm font-medium">
            {formatTime(appointment.start_at)} – {formatTime(appointment.end_at)}
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <User className="size-3.5 text-muted-foreground" />
          {appointment.client.first_name} {appointment.client.last_name}
        </p>
        {appointment.address && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {appointment.address}
          </p>
        )}
        {appointment.technician && (
          <p className="text-xs text-muted-foreground">
            Técnico: {appointment.technician.full_name}
          </p>
        )}
        {appointment.notes && (
          <p className="text-xs text-muted-foreground">{appointment.notes}</p>
        )}
      </div>

      <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
        <Select value={appointment.status} onValueChange={(v) => handleStatusChange(v as AppointmentStatus)}>
          <SelectTrigger className="w-36" disabled={isPending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <WhatsAppConfirmDialog
            phone={appointment.client.phone}
            clientFirstName={appointment.client.first_name}
            type={appointment.type}
            startAt={appointment.start_at}
          />
          <AppointmentForm
            appointment={appointment}
            technicians={technicians}
            existingAppointments={existingAppointments}
            trigger={
              <Button variant="outline" size="icon-sm" title="Editar turno">
                <Pencil className="size-4" />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
