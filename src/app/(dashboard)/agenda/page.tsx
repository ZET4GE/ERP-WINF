import type { Metadata } from "next";
import { CalendarCheck, CalendarClock, CalendarDays, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { CalendarView } from "@/components/agenda/calendar-view";
import { getAgendaRange, type AgendaView } from "@/lib/appointments/date-range";
import { parseDateOnly } from "@/lib/format";
import type { AppointmentWithRelations } from "@/lib/types/appointment";

export const metadata: Metadata = { title: "Agenda — WINF ERP" };

const VALID_VIEWS: AgendaView[] = ["month", "week", "day"];

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const viewParam = typeof params.view === "string" ? params.view : "month";
  const view: AgendaView = VALID_VIEWS.includes(viewParam as AgendaView)
    ? (viewParam as AgendaView)
    : "month";
  const dateParam = typeof params.date === "string" ? params.date : "";
  const parsedDate = dateParam ? parseDateOnly(dateParam) : null;
  const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  const { rangeStart, rangeEnd } = getAgendaRange(view, date);

  const supabase = await createClient();
  const [{ data: appointmentsData }, { data: techniciansData }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, client_id, contract_id, type, start_at, end_at, status, technician_id, address, notes, created_at,
         client:clients(id, first_name, last_name, business_name, phone),
         contract:contracts(id, title),
         technician:profiles(id, full_name)`
      )
      .gte("start_at", rangeStart.toISOString())
      .lte("start_at", rangeEnd.toISOString())
      .order("start_at", { ascending: true }),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const appointments = (appointmentsData ?? []) as unknown as AppointmentWithRelations[];
  const technicians = techniciansData ?? [];

  const pendientesCount = appointments.filter((a) => a.status === "pendiente").length;
  const confirmadosCount = appointments.filter((a) => a.status === "confirmado").length;
  const completadosCount = appointments.filter((a) => a.status === "completado").length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Agenda"
        description="Turnos de instalación, soporte, relevamiento y mantenimiento."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Turnos en el período" value={String(appointments.length)} icon={CalendarDays} />
        <KpiCard title="Pendientes" value={String(pendientesCount)} icon={CalendarClock} />
        <KpiCard title="Confirmados" value={String(confirmadosCount)} icon={CalendarCheck} accent />
        <KpiCard title="Completados" value={String(completadosCount)} icon={CheckCircle2} />
      </div>

      <CalendarView view={view} date={date} appointments={appointments} technicians={technicians} />
    </div>
  );
}
