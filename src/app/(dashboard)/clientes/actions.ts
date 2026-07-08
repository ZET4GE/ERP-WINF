"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { normalizePhoneToWhatsApp } from "@/lib/phone";
import { ARGENTINE_PROVINCES } from "@/lib/argentina";
import { CLIENT_STATUSES } from "@/lib/types/client";

const clientSchema = z.object({
  first_name: z.string().min(1, "Requerido"),
  last_name: z.string().min(1, "Requerido"),
  business_name: z.string().optional(),
  dni: z.string().optional(),
  cuit_cuil: z.string().optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.enum(ARGENTINE_PROVINCES),
  status: z.enum(CLIENT_STATUSES),
  internal_notes: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

function toRow(values: ClientFormValues) {
  return {
    first_name: values.first_name,
    last_name: values.last_name,
    business_name: values.business_name || null,
    dni: values.dni || null,
    cuit_cuil: values.cuit_cuil || null,
    email: values.email || null,
    phone: values.phone ? normalizePhoneToWhatsApp(values.phone) : null,
    address: values.address || null,
    city: values.city || null,
    province: values.province,
    status: values.status,
    internal_notes: values.internal_notes || null,
    lat: values.lat ?? null,
    lng: values.lng ?? null,
  };
}

export async function createClientRecord(values: ClientFormValues) {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...toRow(parsed.data), created_by: user?.id ?? null })
    .select("id")
    .single();

  if (error || !data) return { error: "No se pudo crear el cliente" };

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateClientRecord(id: string, values: ClientFormValues) {
  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) return { error: "Datos inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("clients")
    .update({ ...toRow(parsed.data), updated_by: user?.id ?? null })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el cliente" };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function changeClientStatus(
  id: string,
  status: (typeof CLIENT_STATUSES)[number]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("clients")
    .update({ status, updated_by: user?.id ?? null })
    .eq("id", id);

  if (error) return { error: "No se pudo cambiar el estado" };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { error: null };
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);

  if (count && count > 0) {
    const { error } = await supabase
      .from("clients")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: "No se pudo eliminar el cliente" };
  } else {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return { error: "No se pudo eliminar el cliente" };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
