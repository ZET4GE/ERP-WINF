"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  productSchema,
  bulkAddSchema,
  manageItemSchema,
  type ProductFormValues,
  type ManageItemFormValues,
} from "@/lib/stock/schema";

export async function getInventoryHistory(itemId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_movements")
    .select(
      `id, inventory_item_id, from_status, to_status, notes, created_at,
       client:clients(id, first_name, last_name),
       user:profiles(id, full_name)`
    )
    .eq("inventory_item_id", itemId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function createProduct(values: ProductFormValues) {
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name: parsed.data.name,
    category: parsed.data.category || null,
    cost: parsed.data.cost,
    sale_price: parsed.data.sale_price,
    currency: parsed.data.currency,
    min_stock_threshold: parsed.data.min_stock_threshold,
  });

  if (error) return { error: "No se pudo crear el producto" };

  revalidatePath("/stock");
  return { error: null };
}

export async function updateProduct(id: string, values: ProductFormValues) {
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      category: parsed.data.category || null,
      cost: parsed.data.cost,
      sale_price: parsed.data.sale_price,
      currency: parsed.data.currency,
      min_stock_threshold: parsed.data.min_stock_threshold,
    })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el producto" };

  revalidatePath("/stock");
  return { error: null };
}

export async function bulkAddInventoryItems(values: {
  product_id: string;
  entries: { serial: string; manufacturer?: string }[];
}) {
  const parsed = bulkAddSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos", created: 0, failed: [] as string[] };

  const entries = parsed.data.entries
    .map((e) => ({ serial: e.serial.trim(), manufacturer: e.manufacturer?.trim() || null }))
    .filter((e) => e.serial.length > 0);

  if (entries.length === 0) {
    return { error: "Ingresá al menos un número de serie", created: 0, failed: [] as string[] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let created = 0;
  const failed: string[] = [];

  for (const entry of entries) {
    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        product_id: parsed.data.product_id,
        serial_number: entry.serial,
        manufacturer_number: entry.manufacturer,
      })
      .select("id")
      .single();

    if (error || !data) {
      failed.push(entry.serial);
      continue;
    }

    await supabase.from("inventory_movements").insert({
      inventory_item_id: data.id,
      from_status: null,
      to_status: "en_stock",
      user_id: user?.id ?? null,
      notes: "Alta de stock",
    });

    created++;
  }

  revalidatePath("/stock");
  return { error: null, created, failed };
}

export async function manageInventoryItem(itemId: string, values: ManageItemFormValues) {
  const parsed = manageItemSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await createClient();

  const { data: item, error: fetchError } = await supabase
    .from("inventory_items")
    .select("id, status, client_id")
    .eq("id", itemId)
    .single();

  if (fetchError || !item) return { error: "Equipo no encontrado" };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const clientId = parsed.data.status === "en_stock" ? null : parsed.data.client_id;

  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({
      status: parsed.data.status,
      client_id: clientId,
      notes: parsed.data.notes || null,
    })
    .eq("id", itemId);

  if (updateError) return { error: "No se pudo actualizar el equipo" };

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    inventory_item_id: itemId,
    from_status: item.status,
    to_status: parsed.data.status,
    client_id: clientId,
    user_id: user?.id ?? null,
    notes: parsed.data.notes || null,
  });

  if (movementError) {
    return { error: "El equipo se actualizó pero no se pudo registrar el historial" };
  }

  revalidatePath("/stock");
  revalidatePath("/clientes");
  return { error: null };
}
