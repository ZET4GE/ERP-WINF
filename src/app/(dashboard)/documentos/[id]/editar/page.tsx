import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DocumentForm } from "@/components/documents/document-form";
import type { Document as WinfDocument } from "@/lib/types/document";

export const metadata: Metadata = { title: "Editar documento — WINF ERP" };

export default async function EditarDocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase.from("documents").select("*").eq("id", id).single();

  if (!document) notFound();

  const { data: client } = document.client_id
    ? await supabase
        .from("clients")
        .select("id, first_name, last_name, business_name, city")
        .eq("id", document.client_id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar documento</h1>
        <p className="text-sm text-muted-foreground">{document.number}</p>
      </div>

      <DocumentForm
        document={document as unknown as WinfDocument}
        initialClient={client ?? undefined}
      />
    </div>
  );
}
