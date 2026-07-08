import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientFilters } from "@/components/clients/client-filters";
import { ClientsTable } from "@/components/clients/clients-table";
import { PaginationControls } from "@/components/pagination-controls";
import type { Client } from "@/lib/types/client";

export const metadata: Metadata = { title: "Clientes — WINF ERP" };

const PAGE_SIZE = 15;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "";
  const city = typeof params.city === "string" ? params.city : "";
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (q) {
    const term = q.replace(/[%_]/g, "");
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,dni.ilike.%${term}%,cuit_cuil.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (city) query = query.eq("city", city);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query
    .order("last_name", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const { data: cityRows } = await supabase
    .from("clients")
    .select("city")
    .is("deleted_at", null)
    .not("city", "is", null);

  const cities = Array.from(
    new Set((cityRows ?? []).map((r) => r.city as string).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "es"));

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (city) sp.set("city", city);
    sp.set("page", String(targetPage));
    return `/clientes?${sp.toString()}`;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "cliente cargado" : "clientes cargados"}
          </p>
        </div>
        <Button render={<Link href="/clientes/nuevo" />}>
          <Plus />
          Nuevo cliente
        </Button>
      </div>

      <ClientFilters cities={cities} />

      <ClientsTable clients={(data ?? []) as Client[]} />

      <PaginationControls
        page={page}
        pageCount={pageCount}
        total={total}
        buildHref={buildHref}
      />
    </div>
  );
}
