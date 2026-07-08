import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { StockView } from "@/components/stock/stock-view";
import type { Product } from "@/lib/types/product";
import type { InventoryItemWithProduct } from "@/lib/types/inventory";

export const metadata: Metadata = { title: "Stock — WINF ERP" };

export default async function StockPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: items }] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase
      .from("inventory_items")
      .select(
        `*,
         product:products(id, name, category),
         client:clients(id, first_name, last_name, business_name)`
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <StockView
      products={(products ?? []) as Product[]}
      items={(items ?? []) as unknown as InventoryItemWithProduct[]}
    />
  );
}
