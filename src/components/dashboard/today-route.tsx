import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppointmentTypeBadge } from "@/components/agenda/appointment-type-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/lib/format";
import type { AppointmentWithRelations } from "@/lib/types/appointment";

export function TodayRoute({ appointments }: { appointments: AppointmentWithRelations[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ruta de hoy</CardTitle>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Sin turnos hoy"
            description="No hay turnos agendados para el día de hoy."
          />
        ) : (
          <div className="flex flex-col">
            {appointments.map((appointment, index) => (
              <div key={appointment.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                  {index < appointments.length - 1 && (
                    <span className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 pb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatTime(appointment.start_at)}
                    </span>
                    <AppointmentTypeBadge type={appointment.type} />
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
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
