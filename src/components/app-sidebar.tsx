"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileSignature,
  Package,
  Boxes,
  FileText,
  CalendarDays,
  Wallet,
  LifeBuoy,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, adminOnly: false },
  { title: "Clientes", href: "/clientes", icon: Users, adminOnly: false },
  { title: "Contratos", href: "/contratos", icon: FileSignature, adminOnly: true },
  { title: "Servicios", href: "/servicios", icon: Package, adminOnly: false },
  { title: "Stock", href: "/stock", icon: Boxes, adminOnly: false },
  { title: "Documentos", href: "/documentos", icon: FileText, adminOnly: true },
  { title: "Agenda", href: "/agenda", icon: CalendarDays, adminOnly: false },
  { title: "Finanzas", href: "/finanzas", icon: Wallet, adminOnly: true },
  { title: "Tickets", href: "/tickets", icon: LifeBuoy, adminOnly: false },
  { title: "Configuración", href: "/configuracion", icon: Settings, adminOnly: false },
];

export function AppSidebar({
  openTicketsCount = 0,
  isAdmin = true,
  logoUrl,
  cobradoPct,
}: {
  openTicketsCount?: number;
  isAdmin?: boolean;
  logoUrl?: string | null;
  cobradoPct?: number | null;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Image
            src={logoUrl || "/logo-winf-icon.png"}
            alt="WINF"
            width={28}
            height={28}
            className="shrink-0 object-contain"
            unoptimized={!!logoUrl}
          />
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-heading text-sm font-semibold">WINF ERP</span>
            <span className="text-xs text-sidebar-foreground/60">
              Williams Informática
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      {item.href === "/tickets" && openTicketsCount > 0 && (
                        <Badge className="ml-auto group-data-[collapsible=icon]:hidden">
                          {openTicketsCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {cobradoPct != null && (
        <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col gap-1.5 px-2 py-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sidebar-foreground/60">Cierre de mes</span>
              <span className="font-heading font-semibold text-sidebar-primary">{cobradoPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-accent">
              <div
                className="h-full rounded-full bg-sidebar-primary"
                style={{ width: `${Math.min(100, Math.max(0, cobradoPct))}%` }}
              />
            </div>
            <span className="text-[11px] text-sidebar-foreground/50">Cobrado del mes</span>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
