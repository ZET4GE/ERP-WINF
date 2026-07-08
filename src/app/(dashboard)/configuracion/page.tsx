import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { UsersTable } from "@/components/settings/users-table";
import { RemindersLog, type ReminderLogRow } from "@/components/settings/reminders-log";
import { listProfiles } from "@/app/(dashboard)/configuracion/actions";
import type { CompanySettings } from "@/lib/types/settings";

export const metadata: Metadata = { title: "Configuración — WINF ERP" };

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .single();

  const users = isAdmin ? await listProfiles() : [];

  let reminders: ReminderLogRow[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("whatsapp_reminders")
      .select("id, type, status, message, error_message, created_at, client:clients(first_name, last_name, business_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    reminders = (data ?? []) as unknown as ReminderLogRow[];
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Datos de WINF, usuarios, roles y preferencias.
        </p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          {isAdmin && <TabsTrigger value="usuarios">Usuarios</TabsTrigger>}
          {isAdmin && <TabsTrigger value="recordatorios">Recordatorios</TabsTrigger>}
        </TabsList>
        <TabsContent value="empresa" className="pt-4">
          {settings && (
            <CompanySettingsForm settings={settings as CompanySettings} readOnly={!isAdmin} />
          )}
        </TabsContent>
        {isAdmin && (
          <TabsContent value="usuarios" className="pt-4">
            <UsersTable users={users} currentUserId={user.id} />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="recordatorios" className="pt-4">
            <RemindersLog reminders={reminders} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
