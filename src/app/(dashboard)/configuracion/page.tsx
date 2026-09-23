import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Send } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
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

  const enviadosCount = reminders.filter((r) => r.status === "enviado").length;
  const errorCount = reminders.filter((r) => r.status === "error").length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader title="Configuración" description="Datos de WINF, usuarios, roles y preferencias." />

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
          <TabsContent value="recordatorios" className="flex flex-col gap-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 max-w-sm">
              <KpiCard title="Enviados" value={String(enviadosCount)} icon={Send} accent />
              <KpiCard
                title="Con error"
                value={String(errorCount)}
                icon={AlertTriangle}
                accent={errorCount > 0 ? "destructive" : false}
              />
            </div>
            <RemindersLog reminders={reminders} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
