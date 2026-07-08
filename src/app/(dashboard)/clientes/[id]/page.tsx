import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientDetailView } from "@/components/clients/client-detail-view";
import type { Client } from "@/lib/types/client";
import type { ContractWithRelations } from "@/lib/types/contract";
import type { InventoryItemWithProduct } from "@/lib/types/inventory";
import type { AppointmentWithRelations } from "@/lib/types/appointment";
import type { TicketWithRelations } from "@/lib/types/ticket";

export const metadata: Metadata = { title: "Ficha de cliente — WINF ERP" };

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: contracts }, { data: inventoryItems }, { data: appointments }, { data: technicians }, { data: tickets }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
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
           service:services(id, name, category_id, category:service_categories(id, name)),
           installments(id, contract_item_id, number, amount, due_date, status, paid_at, payment_method, created_at),
           subscription_charges(id, contract_item_id, period, amount, status, paid_at, payment_method, created_at)
         )`
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory_items")
        .select(
          `*,
         product:products(id, name, category),
         client:clients(id, first_name, last_name, business_name)`
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("appointments")
        .select(
          `id, client_id, contract_id, type, start_at, end_at, status, technician_id, address, notes, created_at,
         client:clients(id, first_name, last_name, business_name, phone),
         contract:contracts(id, title),
         technician:profiles(id, full_name)`
        )
        .eq("client_id", id)
        .order("start_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").order("full_name"),
      supabase
        .from("tickets")
        .select(
          `*, client:clients(id, first_name, last_name, business_name),
         inventory_item:inventory_items(id, serial_number, product:products(id, name))`
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!client) notFound();

  return (
    <ClientDetailView
      client={client as Client}
      contracts={(contracts ?? []) as unknown as ContractWithRelations[]}
      inventoryItems={(inventoryItems ?? []) as unknown as InventoryItemWithProduct[]}
      appointments={(appointments ?? []) as unknown as AppointmentWithRelations[]}
      technicians={technicians ?? []}
      tickets={(tickets ?? []) as unknown as TicketWithRelations[]}
    />
  );
}
