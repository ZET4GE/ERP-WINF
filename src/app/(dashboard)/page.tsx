import type { Metadata } from "next";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, Users, ReceiptText, AlertTriangle, TrendingUp, Boxes } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { IncomeExpenseChart, type MonthlyPoint } from "@/components/finance/income-expense-chart";
import { ClientsMap, type MapClient } from "@/components/dashboard/clients-map";
import { CollectionDonut } from "@/components/dashboard/collection-donut";
import { UrgentAttention, type AttentionItem } from "@/components/dashboard/urgent-attention";
import { TodayRoute } from "@/components/dashboard/today-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import { getAgendaRange } from "@/lib/appointments/date-range";
import type { AppointmentWithRelations } from "@/lib/types/appointment";
import type { TicketPriority } from "@/lib/types/ticket";
import type { Client } from "@/lib/types/client";

const PRIORITY_RANK: Record<TicketPriority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baja: 3,
};

export const metadata: Metadata = {
  title: "Dashboard — WINF ERP",
};

function monthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clientName(client: { first_name: string; last_name: string; business_name: string | null }) {
  return client.business_name || `${client.first_name} ${client.last_name}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const today = dateInputValue(now);
  const monthStart = dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = dateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const currentMonthKey = monthKey(now);
  const chartRangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const { rangeStart: dayStart, rangeEnd: dayEnd } = getAgendaRange("day", now);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  const [
    { data: todayAppointmentsData },
    { data: subscriptionItemsData },
    { data: pendingInstallmentsData },
    { data: pendingChargesData },
    { data: clientsActiveCount },
    { data: stockCount },
    { data: transactionsSummary },
    { data: clientsMapData },
    { data: urgentTicketsData },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, client_id, contract_id, type, start_at, end_at, status, technician_id, address, notes, created_at,
         client:clients(id, first_name, last_name, business_name, phone),
         contract:contracts(id, title),
         technician:profiles(id, full_name)`
      )
      .gte("start_at", dayStart.toISOString())
      .lte("start_at", dayEnd.toISOString())
      .in("status", ["pendiente", "confirmado"])
      .order("start_at", { ascending: true }),
    // MRR: solo ítems de suscripción de contratos activos (no hace falta traer
    // el resto de las líneas ni el historial de cuotas/cargos de todo el sistema).
    supabase
      .from("contract_items")
      .select("currency, monthly_amount, contracts!inner(status)")
      .eq("item_type", "suscripcion")
      .eq("contracts.status", "activo"),
    // Cuotas por cobrar/vencidas: solo pendientes con vencimiento hasta fin de
    // este mes (usa el índice status+due_date en vez de traer todo el historial).
    supabase
      .from("installments")
      .select("amount, due_date, contract_item:contract_items(currency)")
      .eq("status", "pendiente")
      .lte("due_date", monthEnd),
    supabase
      .from("subscription_charges")
      .select("amount, period, contract_item:contract_items(currency)")
      .eq("status", "pendiente")
      .lte("period", monthEnd),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "activo")
      .then((res) => ({ data: res.count ?? 0 })),
    supabase
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "en_stock")
      .then((res) => ({ data: res.count ?? 0 })),
    supabase
      .from("transactions")
      .select("type, amount, currency, date")
      .gte("date", dateInputValue(chartRangeStart)),
    supabase
      .from("clients")
      .select("id, first_name, last_name, business_name, status, lat, lng")
      .is("deleted_at", null)
      .not("lat", "is", null)
      .not("lng", "is", null),
    supabase
      .from("tickets")
      .select("id, subject, priority, created_at, client:clients(id, first_name, last_name, business_name)")
      .in("status", ["abierto", "en_proceso"])
      .limit(20),
  ]);

  const todayAppointments = (todayAppointmentsData ?? []) as unknown as AppointmentWithRelations[];
  const firstName = profile?.full_name?.split(" ")[0];

  interface ActiveSubscriptionItemRow {
    currency: "ARS" | "USD";
    monthly_amount: number | null;
  }
  interface PendingInstallmentRow {
    amount: number;
    due_date: string;
    contract_item: { currency: "ARS" | "USD" } | null;
  }
  interface PendingChargeRow {
    amount: number;
    period: string;
    contract_item: { currency: "ARS" | "USD" } | null;
  }

  let mrrArs = 0;
  let mrrUsd = 0;
  let cobrarArs = 0;
  let cobrarUsd = 0;
  let cobrarCount = 0;
  let vencidasCount = 0;

  for (const item of (subscriptionItemsData ?? []) as unknown as ActiveSubscriptionItemRow[]) {
    if (item.currency === "ARS") mrrArs += item.monthly_amount ?? 0;
    else mrrUsd += item.monthly_amount ?? 0;
  }

  for (const installment of (pendingInstallmentsData ?? []) as unknown as PendingInstallmentRow[]) {
    const currency = installment.contract_item?.currency ?? "ARS";
    if (installment.due_date >= monthStart && installment.due_date <= monthEnd) {
      cobrarCount += 1;
      if (currency === "ARS") cobrarArs += installment.amount;
      else cobrarUsd += installment.amount;
    }
    if (installment.due_date < today) vencidasCount += 1;
  }

  for (const charge of (pendingChargesData ?? []) as unknown as PendingChargeRow[]) {
    const currency = charge.contract_item?.currency ?? "ARS";
    if (charge.period === monthStart) {
      cobrarCount += 1;
      if (currency === "ARS") cobrarArs += charge.amount;
      else cobrarUsd += charge.amount;
    }
    if (charge.period < today) vencidasCount += 1;
  }

  const clientesActivos = (clientsActiveCount ?? 0) as unknown as number;
  const equiposEnStock = (stockCount ?? 0) as unknown as number;

  interface SummaryRow { type: "ingreso" | "egreso"; amount: number; currency: "ARS" | "USD"; date: string }
  const summaryRows = (transactionsSummary ?? []) as unknown as SummaryRow[];

  const monthBuckets = new Map<string, MonthlyPoint>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = format(d, "MMM yy", { locale: es });
    monthBuckets.set(key, { key, label: label.charAt(0).toUpperCase() + label.slice(1), ingreso: 0, egreso: 0 });
  }

  let ingresoMesArs = 0;
  let egresoMesArs = 0;
  let ingresoMesUsd = 0;
  let egresoMesUsd = 0;

  for (const row of summaryRows) {
    const rowMonth = row.date.slice(0, 7);
    const bucket = monthBuckets.get(rowMonth);
    if (bucket && row.currency === "ARS") {
      if (row.type === "ingreso") bucket.ingreso += row.amount;
      else bucket.egreso += row.amount;
    }
    if (rowMonth !== currentMonthKey) continue;
    if (row.type === "ingreso") {
      if (row.currency === "ARS") ingresoMesArs += row.amount;
      else ingresoMesUsd += row.amount;
    } else {
      if (row.currency === "ARS") egresoMesArs += row.amount;
      else egresoMesUsd += row.amount;
    }
  }

  const months = Array.from(monthBuckets.values());
  const resultadoMesArs = ingresoMesArs - egresoMesArs;
  const resultadoMesUsd = ingresoMesUsd - egresoMesUsd;

  const clients = (clientsMapData ?? []) as unknown as Client[];
  const mapClients: MapClient[] = clients
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({ id: c.id, name: clientName(c), status: c.status, lat: c.lat as number, lng: c.lng as number }));

  interface UrgentTicketRow {
    id: string;
    subject: string;
    priority: TicketPriority;
    created_at: string;
    client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
  }

  const attentionItems: AttentionItem[] = ((urgentTicketsData ?? []) as unknown as UrgentTicketRow[])
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.created_at < b.created_at ? -1 : 1))
    .slice(0, 6)
    .map((ticket) => ({
      id: ticket.id,
      title: ticket.subject,
      subtitle: ticket.client ? clientName(ticket.client) : undefined,
      priority: ticket.priority,
      href: `/tickets/${ticket.id}`,
    }));

  const donutData = [
    { label: "Cobrado", value: ingresoMesArs, color: "#00C8E0" },
    { label: "Por cobrar", value: cobrarArs, color: "#8AAABF" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {format(now, "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {firstName ? `Hola, ${firstName}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">Resumen general del negocio.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          title="MRR"
          value={formatCurrency(mrrArs, "ARS")}
          icon={Wallet}
          accent
          hint={mrrUsd > 0 ? `+ ${formatCurrency(mrrUsd, "USD")} · suscripciones activas` : "Suscripciones activas"}
        />
        <KpiCard
          title="Clientes activos"
          value={String(clientesActivos)}
          icon={Users}
          href="/clientes?status=activo"
        />
        <KpiCard
          title="Cuotas por cobrar"
          value={formatCurrency(cobrarArs, "ARS")}
          icon={ReceiptText}
          hint={`${cobrarCount} ${cobrarCount === 1 ? "cuota" : "cuotas"} este mes${cobrarUsd > 0 ? ` · + ${formatCurrency(cobrarUsd, "USD")}` : ""}`}
        />
        <KpiCard
          title="Cuotas vencidas"
          value={String(vencidasCount)}
          icon={AlertTriangle}
          accent={vencidasCount > 0 ? "destructive" : false}
          hint="Requieren seguimiento"
          href="/contratos?overdue=1"
        />
        <KpiCard
          title="Resultado del mes"
          value={formatCurrency(resultadoMesArs, "ARS")}
          icon={TrendingUp}
          accent={resultadoMesArs >= 0}
          hint={resultadoMesUsd !== 0 ? `Ingresos − egresos · ${formatCurrency(resultadoMesUsd, "USD")}` : "Ingresos − egresos"}
        />
        <KpiCard title="Equipos en stock" value={String(equiposEnStock)} icon={Boxes} hint="Disponibles" href="/stock" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <IncomeExpenseChart title="Flujo de caja — últimos 6 meses" months={months} variant="area" />
        </div>
        <div className="flex flex-col gap-4">
          <CollectionDonut data={donutData} />
          <UrgentAttention items={attentionItems} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TodayRoute appointments={todayAppointments} />
        <div className="lg:col-span-2">
          <Card className="flex h-96 flex-col gap-0 overflow-hidden py-0">
            <CardHeader className="shrink-0 border-b py-4">
              <CardTitle className="text-base">Clientes en el mapa</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ClientsMap clients={mapClients} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
