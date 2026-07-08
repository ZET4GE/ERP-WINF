import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DocumentDetailView } from "@/components/documents/document-detail-view";
import type { DocumentWithRelations } from "@/lib/types/document";

export const metadata: Metadata = { title: "Documento — WINF ERP" };

export default async function DocumentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select(
      `*, client:clients(id, first_name, last_name, business_name), contract:contracts(id, title)`
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <DocumentDetailView document={data as unknown as DocumentWithRelations} />;
}
