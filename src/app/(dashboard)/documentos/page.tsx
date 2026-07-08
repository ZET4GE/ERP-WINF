import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { DocumentFilters } from "@/components/documents/document-filters";
import { DocumentsTable } from "@/components/documents/documents-table";
import { effectiveDocumentStatus } from "@/lib/documents/status";
import type { DocumentWithRelations } from "@/lib/types/document";

export const metadata: Metadata = { title: "Documentos — WINF ERP" };

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.toLowerCase() : "";
  const docType = typeof params.doc_type === "string" ? params.doc_type : "";
  const status = typeof params.status === "string" ? params.status : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select(
      `*, client:clients(id, first_name, last_name, business_name), contract:contracts(id, title)`
    )
    .order("created_at", { ascending: false });

  const documents = (data ?? []) as unknown as DocumentWithRelations[];

  const filtered = documents.filter((doc) => {
    if (docType && doc.doc_type !== docType) return false;
    if (status && effectiveDocumentStatus(doc) !== status) return false;
    if (from && doc.issued_at < from) return false;
    if (to && doc.issued_at > to) return false;
    if (q) {
      const clientName = doc.client
        ? `${doc.client.first_name} ${doc.client.last_name} ${doc.client.business_name ?? ""}`
        : doc.manual_client_name ?? "";
      if (!clientName.toLowerCase().includes(q) && !doc.number.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "documento" : "documentos"}
          </p>
        </div>
        <Button render={<Link href="/documentos/nuevo" />}>
          <Plus />
          Nuevo documento
        </Button>
      </div>

      <DocumentFilters />

      <DocumentsTable documents={filtered} />
    </div>
  );
}
