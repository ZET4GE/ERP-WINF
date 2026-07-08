import Link from "next/link";
import { FileSignature } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import { contractHasOverdueCharges } from "@/lib/contracts/overdue";
import { formatDate } from "@/lib/format";
import type { ContractWithRelations } from "@/lib/types/contract";

function installmentsProgress(contract: ContractWithRelations) {
  const financedItems = contract.items.filter((item) => item.item_type === "equipo_financiado");
  if (financedItems.length === 0) return null;

  const total = financedItems.reduce((sum, item) => sum + item.installments.length, 0);
  const paid = financedItems.reduce(
    (sum, item) => sum + item.installments.filter((i) => i.status === "pagada").length,
    0
  );
  return { paid, total };
}

export function ContractsTable({ contracts }: { contracts: ContractWithRelations[] }) {
  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileSignature}
        title="No se encontraron contratos"
        description="Probá ajustar la búsqueda o los filtros, o cargá un nuevo contrato."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Categorías</TableHead>
            <TableHead>Cuotas</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Instalación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => {
            const categories = Array.from(
              new Set(contract.items.map((item) => item.service?.category?.name).filter(Boolean))
            ) as string[];
            const progress = installmentsProgress(contract);
            const overdue = contractHasOverdueCharges(contract);

            return (
              <TableRow key={contract.id}>
                <TableCell>
                  <Link
                    href={`/contratos/${contract.id}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {contract.client.first_name} {contract.client.last_name}
                  </Link>
                  {contract.client.business_name && (
                    <p className="text-xs text-muted-foreground">{contract.client.business_name}</p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {overdue && (
                      <span
                        title="Tiene cuotas o cargos vencidos"
                        className="size-2 shrink-0 rounded-full bg-destructive"
                      />
                    )}
                    <Link href={`/contratos/${contract.id}`} className="hover:underline">
                      {contract.title}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {categories.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      categories.map((category) => (
                        <Badge key={category} variant="secondary">
                          {category}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {progress ? `${progress.paid}/${progress.total} pagadas` : "—"}
                </TableCell>
                <TableCell>
                  <ContractStatusBadge status={contract.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(contract.start_date)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
