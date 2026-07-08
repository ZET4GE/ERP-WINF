"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  companySettingsSchema,
  inviteUserSchema,
  type CompanySettingsFormValues,
  type InviteUserFormValues,
} from "@/lib/settings/schema";
import { USER_ROLES, type UserRole } from "@/lib/types/profile";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export async function updateCompanySettings(id: string, values: CompanySettingsFormValues) {
  const parsed = companySettingsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const data = parsed.data;
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from("company_settings")
    .update({
      name: data.name,
      cuit: data.cuit || null,
      contact_phone: data.contact_phone || null,
      contact_email: data.contact_email || null,
      domain: data.domain || null,
      default_billing_day: data.default_billing_day,
      default_currency: data.default_currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !updated) return { error: "No se pudo actualizar (requiere rol admin)" };

  revalidatePath("/configuracion");
  return { error: null };
}

export async function uploadCompanyLogo(id: string, formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Seleccioná un archivo" };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: "No se pudo subir el logo" };

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(path);

  const { error } = await supabase
    .from("company_settings")
    .update({ logo_url: `${publicUrl}?v=${Date.now()}`, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "El logo se subió pero no se pudo guardar la referencia" };

  revalidatePath("/configuracion");
  return { error: null };
}

export async function listProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("full_name", { ascending: true });

  if (error) return [];
  return data;
}

export async function inviteUser(values: InviteUserFormValues) {
  const parsed = inviteUserSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador puede invitar usuarios" };

  const data = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(data.email, {
    data: { full_name: data.full_name, role: data.role },
  });

  if (error) return { error: "No se pudo invitar al usuario: " + error.message };

  revalidatePath("/configuracion");
  return { error: null };
}

export async function updateUserRole(userId: string, role: UserRole) {
  if (!USER_ROLES.includes(role)) return { error: "Rol inválido" };

  const { supabase, user, isAdmin } = await requireAdmin();
  if (!isAdmin) return { error: "Solo un administrador puede cambiar roles" };
  if (user && userId === user.id && role !== "admin") {
    return { error: "No podés quitarte tu propio rol de administrador" };
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: "No se pudo actualizar el rol" };

  revalidatePath("/configuracion");
  return { error: null };
}
