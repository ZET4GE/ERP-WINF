"use client";

import { useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";
import { PayChargeDialog } from "@/components/contracts/pay-charge-dialog";
import { formatCurrency, formatDate, parseDateOnly } from "@/lib/format";
import { isOverdueDate } from "@/lib/contracts/overdue";
import {
  changeContractStatus,
  payInstallment,
  paySubscriptionCharge,
} from "@/app/(dashboard)/contratos/actions";
import { generateComprobanteFromContract } from "@/app/(dashboard)/documentos/actions";
import {
  CONTRACT_STATUSES,
  type ContractItemWithCharges,
  type ContractStatus,
  type ContractWithRelations,
} from "@/lib/types/contract";

const STATUS_LABEL: Record<ContractStatus, string> = {
  activo: "Activo",
  pausado: "Pausado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

function formatMonthYear(period: string) {
  const label = format(parseDateOnly(period), "MMMM yyyy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ChargeStatusBadge({ paid, dueDate }: { paid: boolean; dueDate: string }) {
  if (paid) {
    return (
      <Badge variant="outline" className="border-transparent bg-primary/15 text-primary">
        Pagada
      </Badge>
    );
  }
  if (isOverdueDate(dueDate)) {
    return (
      <Badge variant="outline" className="border-transparent bg-destructive/15 text-destructive">
        Vencida
      </Badge>
    );
  }
  return <Badge variant="outline">Pendiente</Badge>;
}

function EquipoFinanciadoCard({ item }: { item: ContractItemWithCharges }) {
  const installments = [...item.installments].sort((a, b) => a.number - b.number);
  const paidCount = installments.filter((i) => i.status === "pagada").length;
  const allPaid = installments.length > 0 && paidCount === installments.length;
  const progressPct = installments.length ? Math.round((paidCount / installments.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{item.description}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {formatCurrency(item.total_amount ?? 0, item.currency)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {!!item.down_payment && (
            <span>Entrega inicial: {formatCurrency(item.down_payment, item.currency)}</span>
          )}
          <span>{installments.length} cuotas</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span>
              {paidCount}/{installments.length} pagadas
            </span>
            <span className="text-muted-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {allPaid && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary"
          >
            <PartyPopper className="size-4" />
            Equipo saldado
          </motion.div>
        )}

        <div className="flex flex-col divide-y">
          {installments.map((installment) => (
            <div
              key={installment.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">Cuota {installment.number}</span>
                <span className="text-xs text-muted-foreground">
                  Vence {formatDate(installment.due_date)}
                  {installment.status === "pagada" &&
                    installment.paid_at &&
                    ` · pagada ${formatDate(installment.paid_at)}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{formatCurrency(installment.amount, item.currency)}</span>
                <ChargeStatusBadge
                  paid={installment.status === "pagada"}
                  dueDate={installment.due_date}
                />
                {installment.status !== "pagada" && (
                  <PayChargeDialog
                    label={`Cuota ${installment.number}`}
                    amount={installment.amount}
                    currency={item.currency}
                    onConfirm={(values) => payInstallment(installment.id, values)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CargoUnicoCard({ item }: { item: ContractItemWithCharges }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{item.description}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {formatCurrency(item.single_amount ?? 0, item.currency)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">Cargo único</Badge>
      </CardContent>
    </Card>
  );
}

function SuscripcionCard({ item }: { item: ContractItemWithCharges }) {
  const charges = [...item.subscription_charges].sort((a, b) => a.period.localeCompare(b.period));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{item.description}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {formatCurrency(item.monthly_amount ?? 0, item.currency)} / mes
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {(item.subscription_breakdown ?? []).map((line, index) => (
            <div key={index} className="flex justify-between">
              <span>{line.label}</span>
              <span>{formatCurrency(line.amount, item.currency)}</span>
            </div>
          ))}
          <Separator className="my-1" />
          <p>Día de facturación: {item.billing_day}</p>
        </div>

        <div className="flex flex-col divide-y">
          {charges.map((charge) => (
            <div
              key={charge.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{formatMonthYear(charge.period)}</span>
                {charge.status === "pagada" && charge.paid_at && (
                  <span className="text-xs text-muted-foreground">
                    Pagada {formatDate(charge.paid_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{formatCurrency(charge.amount, item.currency)}</span>
                <ChargeStatusBadge paid={charge.status === "pagada"} dueDate={charge.period} />
                {charge.status !== "pagada" && (
                  <PayChargeDialog
                    label={formatMonthYear(charge.period)}
                    amount={charge.amount}
                    currency={item.currency}
                    onConfirm={(values) => paySubscriptionCharge(charge.id, values)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ContractDetailView({ contract }: { contract: ContractWithRelations }) {
  const [isPending, startTransition] = useTransition();
  const [isGeneratingComprobante, startComprobanteTransition] = useTransition();

  function handleStatusChange(status: ContractStatus) {
    startTransition(async () => {
      const result = await changeContractStatus(contract.id, status);
      if (result?.error) toast.error(result.error);
      else toast.success("Estado actualizado");
    });
  }

  function handleGenerateComprobante() {
    startComprobanteTransition(async () => {
      const result = await generateComprobanteFromContract(contract.id);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/clientes/${contract.client_id}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            {contract.client.first_name} {contract.client.last_name}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{contract.title}</h1>
          <p className="text-sm text-muted-foreground">
            Instalación: {formatDate(contract.start_date)}
          </p>
        </div>

        <Select
          value={contract.status}
          onValueChange={(v) => handleStatusChange(v as ContractStatus)}
        >
          <SelectTrigger className="w-40" disabled={isPending}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Button
          variant="outline"
          disabled={isGeneratingComprobante}
          onClick={handleGenerateComprobante}
        >
          <FileText className="size-4" />
          Generar comprobante
        </Button>
      </div>

      {contract.notes && <p className="text-sm text-muted-foreground">{contract.notes}</p>}

      <div className="flex flex-col gap-4">
        {contract.items.map((item) => {
          if (item.item_type === "equipo_financiado") {
            return <EquipoFinanciadoCard key={item.id} item={item} />;
          }
          if (item.item_type === "cargo_unico") {
            return <CargoUnicoCard key={item.id} item={item} />;
          }
          return <SuscripcionCard key={item.id} item={item} />;
        })}
      </div>
    </div>
  );
}
