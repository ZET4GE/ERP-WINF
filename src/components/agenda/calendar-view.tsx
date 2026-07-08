"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { addDays, addMonths, addWeeks, format, subDays, subMonths, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthGrid } from "@/components/agenda/month-grid";
import { WeekGrid } from "@/components/agenda/week-grid";
import { DayList } from "@/components/agenda/day-list";
import { AppointmentForm } from "@/components/agenda/appointment-form";
import type { AgendaView } from "@/lib/appointments/date-range";
import type { AppointmentWithRelations } from "@/lib/types/appointment";

const VIEW_LABEL: Record<AgendaView, string> = {
  month: "Mes",
  week: "Semana",
  day: "Día",
};

export function CalendarView({
  view,
  date,
  appointments,
  technicians,
}: {
  view: AgendaView;
  date: Date;
  appointments: AppointmentWithRelations[];
  technicians: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function navigate(nextView: AgendaView, nextDate: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    params.set("date", format(nextDate, "yyyy-MM-dd"));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function goPrev() {
    if (view === "month") navigate("month", subMonths(date, 1));
    else if (view === "week") navigate("week", subWeeks(date, 1));
    else navigate("day", subDays(date, 1));
  }

  function goNext() {
    if (view === "month") navigate("month", addMonths(date, 1));
    else if (view === "week") navigate("week", addWeeks(date, 1));
    else navigate("day", addDays(date, 1));
  }

  function goToday() {
    navigate(view, new Date());
  }

  const title =
    view === "month"
      ? format(date, "MMMM yyyy", { locale: es })
      : view === "week"
        ? `Semana del ${format(date, "d 'de' MMMM", { locale: es })}`
        : format(date, "d 'de' MMMM yyyy", { locale: es });

  const existingAppointments = appointments.map((a) => ({
    id: a.id,
    start_at: a.start_at,
    end_at: a.end_at,
    status: a.status,
    label: `${a.client.first_name} ${a.client.last_name}`,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goNext}>
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="ml-1 text-lg font-semibold capitalize tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v) => navigate(v as AgendaView, date)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(VIEW_LABEL) as AgendaView[]).map((v) => (
                <SelectItem key={v} value={v}>
                  {VIEW_LABEL[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AppointmentForm technicians={technicians} existingAppointments={existingAppointments} />
        </div>
      </div>

      {view === "month" && (
        <MonthGrid
          date={date}
          appointments={appointments}
          onSelectDay={(d) => navigate("day", d)}
        />
      )}
      {view === "week" && (
        <WeekGrid
          date={date}
          appointments={appointments}
          onSelectDay={(d) => navigate("day", d)}
          onSelectAppointment={(a) => navigate("day", new Date(a.start_at))}
        />
      )}
      {view === "day" && (
        <DayList date={date} appointments={appointments} technicians={technicians} />
      )}
    </div>
  );
}
