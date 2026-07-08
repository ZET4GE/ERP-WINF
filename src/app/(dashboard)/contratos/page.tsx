import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ContractFilters } from "@/components/contracts/contract-filters";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { contractHasOverdueCharges } from "@/lib/contracts/overdue";
import type { ContractWithRelations } from "@/lib/types/contract";

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
  const { data } = await supabase
    .from("contracts")
    .select(
      `id, client_id, title, status, start_date, notes, created_at,
       client:clients(id, first_name, last_name, business_name),
       items:contract_items(
         id, contract_id, item_type, service_id, description, currency,
         total_amount, down_payment, installments_count, inventory_item_id,
         single_amount, monthly_amount, subscription_breakdown, billing_day,
         subscription_start_date, created_at,
         service:services(id, name, category_id, category:service_categories(id, name)),
         installments(id, contract_item_id, number, amount, due_date, status, paid_at, payment_method, created_at),
         subscription_charges(id, contract_item_id, period, amount, status, paid_at, payment_method, created_at)
       )`
    )
    .order("created_at", { ascending: false });

  const contracts = (data ?? []) as unknown as ContractWithRelations[];

  const categories = Array.from(
    new Set(
      contracts.flatMap((contract) =>
        contract.items.map((item) => item.service?.category?.name).filter(Boolean) as string[]
      )
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "contrato" : "contratos"}
          </p>
        </div>
        <Button render={<Link href="/contratos/nuevo" />}>
          <Plus />
          Nuevo contrato
        </Button>
      </div>

      <ContractFilters categories={categories} />

      <ContractsTable contracts={filtered} />
    </div>
  );
}
