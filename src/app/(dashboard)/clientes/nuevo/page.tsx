import type { Metadata } from "next";

import { ClientForm } from "@/components/clients/client-form";

export const metadata: Metadata = { title: "Nuevo cliente — WINF ERP" };

export default function NuevoClientePage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo cliente</h1>
        <p className="text-sm text-muted-foreground">
          Cargá los datos del cliente y ubicalo en el mapa.
        </p>
      </div>

      <div className="max-w-3xl">
        <ClientForm />
      </div>
    </div>
  );
}
