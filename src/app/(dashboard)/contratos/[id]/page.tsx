import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ContractDetailView } from "@/components/contracts/contract-detail-view";
import type { ContractWithRelations } from "@/lib/types/contract";

export const metadata: Metadata = { title: "Contrato — WINF ERP" };

export default async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <ContractDetailView contract={data as unknown as ContractWithRelations} />;
}
