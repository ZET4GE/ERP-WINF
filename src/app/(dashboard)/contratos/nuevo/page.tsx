import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ContractWizard } from "@/components/contracts/contract-wizard";
import type { ContractItemFormValues } from "@/lib/contracts/schema";

export const metadata: Metadata = { title: "Nuevo contrato — WINF ERP" };

export default async function NuevoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const clientId = typeof params.client_id === "string" ? params.client_id : undefined;
  const fromDocumentId =
    typeof params.from_document === "string" ? params.from_document : undefined;

  const supabase = await createClient();

  const [
    { data: categories },
    { data: services },
    { data: inventoryItems },
    { data: settings },
    clientResult,
    documentResult,
  ] =
    await Promise.all([
      supabase.from("service_categories").select("id, name").eq("active", true).order("name"),
      supabase
        .from("services")
        .select("id, category_id, name, type, base_price, currency")
        .eq("active", true)
        .order("name"),
      supabase
        .from("inventory_items")
        .select("id, serial_number, product:products(name)")
        .eq("status", "en_stock")
        .order("serial_number"),
      supabase.from("company_settings").select("default_currency, default_billing_day").limit(1).single(),
      clientId
        ? supabase
            .from("clients")
            .select("id, first_name, last_name, business_name, city")
            .eq("id", clientId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      fromDocumentId
        ? supabase
            .from("documents")
            .select("currency, items")
            .eq("id", fromDocumentId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const initialItems: ContractItemFormValues[] | undefined = documentResult.data
    ? documentResult.data.items.map(
        (item: { description: string; quantity: number; unit_price: number }) => ({
          item_type: "cargo_unico" as const,
          service_id: null,
          description: item.description,
          currency: documentResult.data!.currency,
          single_amount: item.quantity * item.unit_price,
        })
      )
    : undefined;

  const availableInventory = (inventoryItems ?? []).map((item) => {
    const product = item.product as unknown as { name: string } | { name: string }[] | null;
    const productName = Array.isArray(product) ? product[0]?.name : product?.name;
    return {
      id: item.id,
      serial_number: item.serial_number,
      product_name: productName ?? "—",
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo contrato</h1>
        <p className="text-sm text-muted-foreground">
          Seleccioná el cliente, cargá los ítems del contrato y confirmá.
        </p>
      </div>

      <ContractWizard
        categories={categories ?? []}
        services={services ?? []}
        availableInventory={availableInventory}
        initialClient={clientResult.data ?? undefined}
        initialItems={initialItems}
        defaultCurrency={settings?.default_currency}
        defaultBillingDay={settings?.default_billing_day}
      />
    </div>
  );
}
