import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const { count: openTicketsCount } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["abierto", "en_proceso"]);

  const { data: settings } = await supabase
    .from("company_settings")
    .select("logo_url")
    .limit(1)
    .single();

  return (
    <SidebarProvider>
      <AppSidebar
        openTicketsCount={openTicketsCount ?? 0}
        isAdmin={profile?.role !== "tecnico"}
        logoUrl={settings?.logo_url}
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
