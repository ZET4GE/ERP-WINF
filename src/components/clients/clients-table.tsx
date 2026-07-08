import Link from "next/link";
import { Building2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import type { Client } from "@/lib/types/client";

export function ClientsTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No se encontraron clientes"
        description="Probá ajustar la búsqueda o los filtros, o cargá un nuevo cliente."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>DNI / CUIT</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Localidad</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Link
                  href={`/clientes/${client.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {client.first_name} {client.last_name}
                </Link>
                {client.business_name && (
                  <p className="text-xs text-muted-foreground">
                    {client.business_name}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.dni || client.cuit_cuil || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.phone || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.city || "—"}
              </TableCell>
              <TableCell>
                <ClientStatusBadge status={client.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
