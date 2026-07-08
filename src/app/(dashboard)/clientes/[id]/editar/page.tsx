import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/clients/client-form";
import type { Client } from "@/lib/types/client";

export const metadata: Metadata = { title: "Editar cliente — WINF ERP" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Editar cliente
        </h1>
        <p className="text-sm text-muted-foreground">
          {client.first_name} {client.last_name}
        </p>
      </div>

      <div className="max-w-3xl">
        <ClientForm client={client as Client} />
      </div>
    </div>
  );
}
