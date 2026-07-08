import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ServiceCatalog } from "@/components/services/service-catalog";
import type { Service, ServiceCategory } from "@/lib/types/service";

export const metadata: Metadata = { title: "Servicios — WINF ERP" };

export default async function ServiciosPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
  ]);

  return (
    <ServiceCatalog
      categories={(categories ?? []) as ServiceCategory[]}
      services={(services ?? []) as Service[]}
    />
  );
}
