import { CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { EmptyState } from "@/components/empty-state";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import type { AppointmentStatus, AppointmentWithRelations } from "@/lib/types/appointment";

type OverlapCandidate = {
  id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  label: string;
};

export function DayList({
  date,
  appointments,
  technicians,
}: {
  date: Date;
  appointments: AppointmentWithRelations[];
  technicians: { id: string; full_name: string }[];
}) {
  const sorted = [...appointments].sort((a, b) => a.start_at.localeCompare(b.start_at));

  const existingByAppointment = (currentId: string): OverlapCandidate[] =>
    sorted
      .filter((a) => a.id !== currentId)
      .map((a) => ({
        id: a.id,
        start_at: a.start_at,
        end_at: a.end_at,
        status: a.status,
        label: `${a.client.first_name} ${a.client.last_name}`,
      }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-medium capitalize text-muted-foreground">
        {format(date, "EEEE d 'de' MMMM", { locale: es })}
      </h2>

      {sorted.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Sin turnos este día"
          description="No hay turnos programados para esta fecha."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              technicians={technicians}
              existingAppointments={existingByAppointment(appointment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
