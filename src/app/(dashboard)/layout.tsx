import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const monthStart = dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = dateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [
    { data: profile },
    { count: openTicketsCount },
    { data: settings },
    { data: cobradoTransactions },
    { data: pendingInstallments },
    { data: pendingCharges },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["abierto", "en_proceso"]),
    supabase.from("company_settings").select("logo_url").limit(1).single(),
    supabase
      .from("transactions")
      .select("amount, currency")
      .eq("type", "ingreso")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase
      .from("installments")
      .select("amount, due_date")
      .eq("status", "pendiente")
      .gte("due_date", monthStart)
      .lte("due_date", monthEnd),
    supabase
      .from("subscription_charges")
      .select("amount, period")
      .eq("status", "pendiente")
      .eq("period", monthStart),
  ]);

  const cobradoArs = (cobradoTransactions ?? [])
    .filter((tx) => tx.currency === "ARS")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const pendienteArs =
    (pendingInstallments ?? []).reduce((sum, i) => sum + i.amount, 0) +
    (pendingCharges ?? []).reduce((sum, c) => sum + c.amount, 0);
  const totalArs = cobradoArs + pendienteArs;
  const cobradoPct = totalArs > 0 ? Math.round((cobradoArs / totalArs) * 100) : null;

  return (
    <SidebarProvider>
      <AppSidebar
        openTicketsCount={openTicketsCount ?? 0}
        isAdmin={profile?.role !== "tecnico"}
        logoUrl={settings?.logo_url}
        cobradoPct={cobradoPct}
      />
      <SidebarInset>
        <SiteHeader
          fullName={profile?.full_name ?? user.email ?? "Usuario"}
          email={user.email ?? ""}
        />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
