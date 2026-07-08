import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppointmentTypeBadge } from "@/components/agenda/appointment-type-badge";
import { WhatsAppConfirmDialog } from "@/components/agenda/whatsapp-confirm-dialog";
import { formatDateTime } from "@/lib/format";
import type { AppointmentWithRelations } from "@/lib/types/appointment";

export function UpcomingAppointments({
  appointments,
}: {
  appointments: AppointmentWithRelations[];
}) {
  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Sin turnos próximos"
        description="Los próximos turnos agendados van a aparecer acá."
      />
    );
  }

  return (
    <div className="flex flex-col divide-y rounded-xl border">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <AppointmentTypeBadge type={appointment.type} />
            <span className="text-xs font-medium text-muted-foreground">
              {formatDateTime(appointment.start_at)}
            </span>
          </div>
          <Link
            href={`/agenda?view=day&date=${appointment.start_at.slice(0, 10)}`}
            className="text-sm font-medium hover:underline"
          >
            {appointment.client.first_name} {appointment.client.last_name}
          </Link>
          {appointment.address && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              {appointment.address}
            </p>
          )}
          <div>
            <WhatsAppConfirmDialog
              phone={appointment.client.phone}
              clientFirstName={appointment.client.first_name}
              type={appointment.type}
              startAt={appointment.start_at}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
