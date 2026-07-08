"use client";

import { useState } from "react";
import { useTransition } from "react";
import { addMinutes, differenceInMinutes, eachDayOfInterval, format, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { getAgendaRange } from "@/lib/appointments/date-range";
import { rescheduleAppointment } from "@/app/(dashboard)/agenda/actions";
import { TYPE_DOT_CLASS } from "@/components/agenda/appointment-type-badge";
import type { AppointmentWithRelations } from "@/lib/types/appointment";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 – 20:00
const ROW_HEIGHT = 56;

export function WeekGrid({
  date,
  appointments,
  onSelectDay,
  onSelectAppointment,
}: {
  date: Date;
  appointments: AppointmentWithRelations[];
  onSelectDay: (d: Date) => void;
  onSelectAppointment: (a: AppointmentWithRelations) => void;
}) {
  const { rangeStart, rangeEnd } = getAgendaRange("week", date);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function appointmentsForDay(day: Date) {
    return appointments.filter((a) => isSameDay(new Date(a.start_at), day));
  }

  function handleDrop(day: Date, e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const appointment = appointments.find((a) => a.id === id);
    setDraggingId(null);
    if (!appointment) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMinutes = (offsetY / ROW_HEIGHT) * 60 + HOURS[0] * 60;
    const snappedMinutes = Math.max(0, Math.round(rawMinutes / 15) * 15);

    const newStart = new Date(day);
    newStart.setHours(0, snappedMinutes, 0, 0);
    const durationMinutes = differenceInMinutes(
      new Date(appointment.end_at),
      new Date(appointment.start_at)
    );
    const newEnd = addMinutes(newStart, durationMinutes);

    if (
      newStart.getTime() === new Date(appointment.start_at).getTime() &&
      isSameDay(day, new Date(appointment.start_at))
    ) {
      return;
    }

    startTransition(async () => {
      const result = await rescheduleAppointment(
        appointment.id,
        newStart.toISOString(),
        newEnd.toISOString()
      );
      if (result?.error) toast.error(result.error);
      else toast.success("Turno reprogramado");
    });
  }

  return (
    <div className="flex overflow-hidden rounded-xl border">
      <div className="flex w-14 shrink-0 flex-col border-r bg-muted/30">
        <div className="h-12 border-b" />
        {HOURS.map((hour) => (
          <div
            key={hour}
            style={{ height: ROW_HEIGHT }}
            className="border-b px-1 text-right text-[0.7rem] text-muted-foreground"
          >
            {String(hour).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 divide-x">
        {days.map((day) => (
          <div key={day.toISOString()} className="flex flex-col">
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex h-12 flex-col items-center justify-center border-b hover:bg-muted/40"
            >
              <span className="text-[0.7rem] text-muted-foreground">
                {format(day, "EEE", { locale: es })}
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-medium",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d", { locale: es })}
              </span>
            </button>

            <div
              className="relative"
              style={{ height: ROW_HEIGHT * HOURS.length }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(day, e)}
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  style={{ height: ROW_HEIGHT }}
                  className="border-b last:border-b-0"
                />
              ))}

              {appointmentsForDay(day).map((appt) => {
                const start = new Date(appt.start_at);
                const startHourFraction = start.getHours() + start.getMinutes() / 60;
                const durationMinutes = differenceInMinutes(
                  new Date(appt.end_at),
                  new Date(appt.start_at)
                );
                const top = Math.max(0, (startHourFraction - HOURS[0]) * ROW_HEIGHT);
                const height = Math.max(22, (durationMinutes / 60) * ROW_HEIGHT);

                return (
                  <div
                    key={appt.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", appt.id);
                      setDraggingId(appt.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => onSelectAppointment(appt)}
                    style={{ top, height }}
                    className={cn(
                      "absolute inset-x-0.5 z-10 cursor-grab overflow-hidden rounded border border-background bg-muted px-1 py-0.5 text-[0.7rem] leading-tight hover:brightness-95 active:cursor-grabbing",
                      draggingId === appt.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className={cn("size-1.5 shrink-0 rounded-full", TYPE_DOT_CLASS[appt.type])} />
                      <span className="shrink-0 text-muted-foreground">{formatTime(appt.start_at)}</span>
                      <span className="truncate font-medium">
                        {appt.client.first_name} {appt.client.last_name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
