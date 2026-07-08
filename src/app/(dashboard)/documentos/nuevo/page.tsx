import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { DocumentForm } from "@/components/documents/document-form";

export const metadata: Metadata = { title: "Nuevo documento — WINF ERP" };

export default async function NuevoDocumentoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const clientId = typeof params.client_id === "string" ? params.client_id : undefined;

  const supabase = await createClient();

  const { data: client } = clientId
    ? await supabase
        .from("clients")
        .select("id, first_name, last_name, business_name, city")
        .eq("id", clientId)
        .maybeSingle()
    : { data: null };

  const { data: settings } = await supabase
    .from("company_settings")
    .select("default_currency")
    .limit(1)
    .single();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo documento</h1>
        <p className="text-sm text-muted-foreground">
          Presupuesto, informe técnico, remito/OT o comprobante.
        </p>
      </div>

      <DocumentForm initialClient={client ?? undefined} defaultCurrency={settings?.default_currency} />
    </div>
  );
}
