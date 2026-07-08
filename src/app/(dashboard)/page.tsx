import type { Metadata } from "next";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, Users, ReceiptText, AlertTriangle, TrendingUp, Boxes } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { UpcomingAppointments } from "@/components/agenda/upcoming-appointments";
import { IncomeExpenseChart, type MonthlyPoint } from "@/components/finance/income-expense-chart";
import { ClientsMap, type MapClient } from "@/components/dashboard/clients-map";
import { RecentActivity, type ActivityItem } from "@/components/dashboard/recent-activity";
import { DOCUMENT_TYPE_LABEL } from "@/components/documents/document-status-badge";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
import type { AppointmentWithRelations } from "@/lib/types/appointment";
import type { ContractWithRelations } from "@/lib/types/contract";
import type { Client } from "@/lib/types/client";

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

  const [
    { data: appointmentsData },
    { data: contractsData },
    { data: clientsActiveCount },
    { data: stockCount },
    { data: transactionsSummary },
    { data: clientsMapData },
    { data: recentTransactions },
    { data: recentContracts },
    { data: recentDocuments },
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        `id, client_id, contract_id, type, start_at, end_at, status, technician_id, address, notes, created_at,
         client:clients(id, first_name, last_name, business_name, phone),
         contract:contracts(id, title),
         technician:profiles(id, full_name)`
      )
      .gte("start_at", new Date().toISOString())
      .in("status", ["pendiente", "confirmado"])
      .order("start_at", { ascending: true })
      .limit(5),
    supabase
      .from("contracts")
      .select(
        `id, client_id, title, status, start_date, notes, created_at,
         client:clients(id, first_name, last_name, business_name),
         items:contract_items(
           id, contract_id, item_type, service_id, description, currency,
           total_amount, down_payment, installments_count, inventory_item_id,
           single_amount, monthly_amount, subscription_breakdown, billing_day,
           subscription_start_date, created_at,
           installments(id, contract_item_id, number, amount, due_date, status, paid_at, payment_method, created_at),
           subscription_charges(id, contract_item_id, period, amount, status, paid_at, payment_method, created_at)
         )`
      ),
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
      .from("transactions")
      .select("id, amount, currency, date, description")
      .eq("type", "ingreso")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("contracts")
      .select("id, title, created_at, client:clients(id, first_name, last_name, business_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("documents")
      .select("id, doc_type, number, created_at, client:clients(id, first_name, last_name, business_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const upcomingAppointments = (appointmentsData ?? []) as unknown as AppointmentWithRelations[];
  const contracts = (contractsData ?? []) as unknown as ContractWithRelations[];

  let mrrArs = 0;
  let mrrUsd = 0;
  let cobrarArs = 0;
  let cobrarUsd = 0;
  let cobrarCount = 0;
  let vencidasCount = 0;

  for (const contract of contracts) {
    for (const item of contract.items) {
      if (item.item_type === "suscripcion" && contract.status === "activo") {
        if (item.currency === "ARS") mrrArs += item.monthly_amount ?? 0;
        else mrrUsd += item.monthly_amount ?? 0;
      }

      for (const installment of item.installments) {
        if (installment.status !== "pendiente") continue;
        if (installment.due_date >= monthStart && installment.due_date <= monthEnd) {
          cobrarCount += 1;
          if (item.currency === "ARS") cobrarArs += installment.amount;
          else cobrarUsd += installment.amount;
        }
        if (installment.due_date < today) vencidasCount += 1;
      }

      for (const charge of item.subscription_charges) {
        if (charge.status !== "pendiente") continue;
        if (charge.period === monthStart) {
          cobrarCount += 1;
          if (item.currency === "ARS") cobrarArs += charge.amount;
          else cobrarUsd += charge.amount;
        }
        if (charge.period < today) vencidasCount += 1;
      }
    }
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

  interface RecentTransactionRow { id: string; amount: number; currency: "ARS" | "USD"; date: string; description: string | null }
  interface RecentContractRow {
    id: string;
    title: string;
    created_at: string;
    client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
  }
  interface RecentDocumentRow {
    id: string;
    doc_type: keyof typeof DOCUMENT_TYPE_LABEL;
    number: string | null;
    created_at: string;
    client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
  }

  const activityItems: ActivityItem[] = [
    ...((recentTransactions ?? []) as unknown as RecentTransactionRow[]).map((tx) => ({
      id: tx.id,
      kind: "pago" as const,
      title: `Pago recibido — ${formatCurrency(tx.amount, tx.currency)}`,
      subtitle: tx.description ?? undefined,
      date: tx.date,
      href: "/finanzas",
    })),
    ...((recentContracts ?? []) as unknown as RecentContractRow[]).map((c) => ({
      id: c.id,
      kind: "contrato" as const,
      title: c.title,
      subtitle: c.client ? clientName(c.client) : undefined,
      date: c.created_at,
      href: `/contratos/${c.id}`,
    })),
    ...((recentDocuments ?? []) as unknown as RecentDocumentRow[]).map((d) => ({
      id: d.id,
      kind: "documento" as const,
      title: `${DOCUMENT_TYPE_LABEL[d.doc_type]}${d.number ? ` #${d.number}` : ""}`,
      subtitle: d.client ? clientName(d.client) : undefined,
      date: d.created_at,
      href: `/documentos/${d.id}`,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
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
          <IncomeExpenseChart title="Ingresos vs egresos — últimos 6 meses" months={months} />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Próximos turnos</h2>
          <UpcomingAppointments appointments={upcomingAppointments} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 h-96">
          <ClientsMap clients={mapClients} />
        </div>
        <RecentActivity items={activityItems} />
      </div>
    </div>
  );
}
