import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, FileText, Pause, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { ContractFilters } from "@/components/contracts/contract-filters";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { contractHasOverdueCharges } from "@/lib/contracts/overdue";
import type { ContractListRow } from "@/lib/types/contract";

export const metadata: Metadata = { title: "Contratos — WINF ERP" };

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const category = typeof params.category === "string" ? params.category : "";
  const overdueOnly = params.overdue === "1";

  const supabase = await createClient();
  // Solo las columnas que la tabla y el cálculo de vencidos/progreso usan
  // (nada de montos, notas ni historial completo de pagos): esta pantalla
  // se recorre entera en cada visita, sin paginar.
  const { data } = await supabase
    .from("contracts")
    .select(
      `id, title, status, start_date, created_at,
       client:clients(id, first_name, last_name, business_name),
       items:contract_items(
         item_type,
         service:services(id, name, category_id, category:service_categories(id, name)),
         installments(status, due_date),
         subscription_charges(status, period)
       )`
    )
    .order("created_at", { ascending: false });

  const contracts = (data ?? []) as unknown as ContractListRow[];

  const categories = Array.from(
    new Set(
      contracts.flatMap((contract) =>
        contract.items.map((item) => item.service?.category?.name).filter(Boolean) as string[]
      )
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  const activosCount = contracts.filter((c) => c.status === "activo").length;
  const pausadosCount = contracts.filter((c) => c.status === "pausado").length;
  const vencidosCount = contracts.filter((c) => contractHasOverdueCharges(c)).length;

  const filtered = contracts.filter((contract) => {
    if (status && contract.status !== status) return false;
    if (category) {
      const hasCategory = contract.items.some((item) => item.service?.category?.name === category);
      if (!hasCategory) return false;
    }
    if (overdueOnly && !contractHasOverdueCharges(contract)) return false;
    if (q) {
      const clientName = `${contract.client.first_name} ${contract.client.last_name} ${
        contract.client.business_name ?? ""
      }`.toLowerCase();
      if (!clientName.includes(q) && !contract.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        title="Contratos"
        description={`${filtered.length} ${filtered.length === 1 ? "contrato" : "contratos"}`}
      >
        <Button render={<Link href="/contratos/nuevo" />}>
          <Plus />
          Nuevo contrato
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total contratos" value={String(contracts.length)} icon={FileText} />
        <KpiCard title="Activos" value={String(activosCount)} icon={FileText} accent />
        <KpiCard title="Pausados" value={String(pausadosCount)} icon={Pause} />
        <KpiCard
          title="Con cuotas vencidas"
          value={String(vencidosCount)}
          icon={AlertTriangle}
          accent={vencidosCount > 0 ? "destructive" : false}
          href="/contratos?overdue=1"
        />
      </div>

      <ContractFilters categories={categories} />

      <ContractsTable contracts={filtered} />
    </div>
  );
}
