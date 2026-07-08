"use client";

import { eachDayOfInterval, format, isSameDay, isSameMonth, isToday } from "date-fns";
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { getAgendaRange } from "@/lib/appointments/date-range";
import { TYPE_DOT_CLASS } from "@/components/agenda/appointment-type-badge";
import type { AppointmentWithRelations } from "@/lib/types/appointment";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function MonthGrid({
  date,
  appointments,
  onSelectDay,
}: {
  date: Date;
  appointments: AppointmentWithRelations[];
  onSelectDay: (d: Date) => void;
}) {
  const { rangeStart, rangeEnd } = getAgendaRange("month", date);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function appointmentsForDay(day: Date) {
    return appointments
      .filter((a) => isSameDay(new Date(a.start_at), day))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 divide-x divide-y">
        {weeks.map((week) =>
          week.map((day) => {
            const dayAppointments = appointmentsForDay(day);
            const visible = dayAppointments.slice(0, 3);
            const overflow = dayAppointments.length - visible.length;
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  "flex min-h-24 flex-col items-stretch gap-1 p-1.5 text-left align-top hover:bg-muted/40",
                  !isSameMonth(day, date) && "bg-muted/10 text-muted-foreground/60"
                )}
              >
                <span
                  className={cn(
                    "self-start rounded-full px-1.5 text-xs font-medium",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d", { locale: es })}
                </span>
                <div className="flex flex-col gap-0.5">
                  {visible.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center gap-1 truncate rounded bg-muted/60 px-1 py-0.5 text-[0.7rem]"
                    >
                      <span
                        className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT_CLASS[appt.type])}
                      />
                      <span className="shrink-0 text-muted-foreground">
                        {formatTime(appt.start_at)}
                      </span>
                      <span className="truncate">{appt.client.first_name} {appt.client.last_name}</span>
                    </div>
                  ))}
                  {overflow > 0 && (
                    <span className="px-1 text-[0.7rem] text-muted-foreground">
                      +{overflow} más
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
