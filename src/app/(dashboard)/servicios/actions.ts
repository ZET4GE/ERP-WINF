"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { CURRENCIES, SERVICE_TYPES } from "@/lib/types/service";

const categorySchema = z.object({
  name: z.string().min(1, "Requerido"),
});

export async function createCategory(values: z.infer<typeof categorySchema>) {
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_categories")
    .insert({ name: parsed.data.name });

  if (error) return { error: "No se pudo crear la categoría" };

  revalidatePath("/servicios");
  return { error: null };
}

export async function updateCategory(
  id: string,
  values: z.infer<typeof categorySchema>
) {
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_categories")
    .update({ name: parsed.data.name })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar la categoría" };

  revalidatePath("/servicios");
  return { error: null };
}

export async function toggleCategoryActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_categories")
    .update({ active })
    .eq("id", id);

  if (error) return { error: "No se pudo cambiar el estado de la categoría" };

  revalidatePath("/servicios");
  return { error: null };
}

const serviceSchema = z.object({
  category_id: z.string().min(1, "Requerido"),
  name: z.string().min(1, "Requerido"),
  type: z.enum(SERVICE_TYPES),
  base_price: z.number().nonnegative("Debe ser positivo"),
  currency: z.enum(CURRENCIES),
  description: z.string().optional(),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export async function createService(values: ServiceFormValues) {
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    category_id: parsed.data.category_id,
    name: parsed.data.name,
    type: parsed.data.type,
    base_price: parsed.data.base_price,
    currency: parsed.data.currency,
    description: parsed.data.description || null,
  });

  if (error) return { error: "No se pudo crear el servicio" };

  revalidatePath("/servicios");
  return { error: null };
}

export async function updateService(id: string, values: ServiceFormValues) {
  const parsed = serviceSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      category_id: parsed.data.category_id,
      name: parsed.data.name,
      type: parsed.data.type,
      base_price: parsed.data.base_price,
      currency: parsed.data.currency,
      description: parsed.data.description || null,
    })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el servicio" };

  revalidatePath("/servicios");
  return { error: null };
}

export async function toggleServiceActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ active })
    .eq("id", id);

  if (error) return { error: "No se pudo cambiar el estado del servicio" };

  revalidatePath("/servicios");
  return { error: null };
}
