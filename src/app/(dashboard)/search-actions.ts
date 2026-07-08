"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface GlobalSearchResults {
  clients: SearchResult[];
  contracts: SearchResult[];
  inventoryItems: SearchResult[];
  documents: SearchResult[];
}

const EMPTY: GlobalSearchResults = {
  clients: [],
  contracts: [],
  inventoryItems: [],
  documents: [],
};

function clientName(client: { first_name: string; last_name: string; business_name: string | null }) {
  return client.business_name || `${client.first_name} ${client.last_name}`;
}

export async function globalSearch(rawQuery: string): Promise<GlobalSearchResults> {
  const term = rawQuery.trim().replace(/[%_]/g, "");
  if (term.length < 2) return EMPTY;

  const supabase = await createClient();
  const like = `%${term}%`;

  const [clientsRes, contractsRes, inventoryRes, documentsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, first_name, last_name, business_name, dni, cuit_cuil, phone, city")
      .is("deleted_at", null)
      .or(
        `first_name.ilike.${like},last_name.ilike.${like},business_name.ilike.${like},dni.ilike.${like},cuit_cuil.ilike.${like},phone.ilike.${like}`
      )
      .limit(6),
    supabase
      .from("contracts")
      .select("id, title, status, client:clients(id, first_name, last_name, business_name)")
      .ilike("title", like)
      .limit(6),
    supabase
      .from("inventory_items")
      .select("id, serial_number, status, product:products(id, name)")
      .ilike("serial_number", like)
      .limit(6),
    supabase
      .from("documents")
      .select("id, number, doc_type, client:clients(id, first_name, last_name, business_name)")
      .ilike("number", like)
      .limit(6),
  ]);

  const clients = (clientsRes.data ?? []).map((c) => ({
    id: c.id as string,
    title: clientName(c as { first_name: string; last_name: string; business_name: string | null }),
    subtitle: (c.city as string | null) ?? undefined,
    href: `/clientes/${c.id}`,
  }));

  const contracts = (contractsRes.data ?? []).map((row) => {
    const c = row as unknown as {
      id: string;
      title: string;
      client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
    };
    return {
      id: c.id,
      title: c.title,
      subtitle: c.client ? clientName(c.client) : undefined,
      href: `/contratos/${c.id}`,
    };
  });

  const inventoryItems = (inventoryRes.data ?? []).map((row) => {
    const item = row as unknown as {
      id: string;
      serial_number: string;
      product: { name: string } | null;
    };
    return {
      id: item.id,
      title: item.serial_number,
      subtitle: item.product?.name,
      href: "/stock",
    };
  });

  const documents = (documentsRes.data ?? []).map((row) => {
    const doc = row as unknown as {
      id: string;
      number: string | null;
      doc_type: string;
      client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
    };
    return {
      id: doc.id,
      title: doc.number ?? "Sin número",
      subtitle: doc.client ? clientName(doc.client) : undefined,
      href: `/documentos/${doc.id}`,
    };
  });

  return { clients, contracts, inventoryItems, documents };
}
