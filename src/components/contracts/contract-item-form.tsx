"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { contractItemSchema, type ContractItemFormValues } from "@/lib/contracts/schema";
import { CONTRACT_ITEM_TYPES, type ContractItemType } from "@/lib/types/contract";

export interface ServiceOption {
  id: string;
  category_id: string;
  name: string;
  type: "unico" | "recurrente";
  base_price: number;
  currency: "ARS" | "USD";
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface InventoryOption {
  id: string;
  serial_number: string;
  product_name: string;
}

const ITEM_TYPE_LABEL: Record<ContractItemType, string> = {
  equipo_financiado: "Equipo financiado",
  cargo_unico: "Cargo único",
  suscripcion: "Suscripción",
};

export function ContractItemForm({
  categories,
  services,
  availableInventory,
  defaultStartDate,
  defaultCurrency = "ARS",
  defaultBillingDay = 1,
  onAdd,
}: {
  categories: CategoryOption[];
  services: ServiceOption[];
  availableInventory: InventoryOption[];
  defaultStartDate: string;
  defaultCurrency?: "ARS" | "USD";
  defaultBillingDay?: number;
  onAdd: (item: ContractItemFormValues) => void;
}) {
  const [itemType, setItemType] = useState<ContractItemType>("equipo_financiado");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState<"ARS" | "USD">(defaultCurrency);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // equipo_financiado
  const [totalAmount, setTotalAmount] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [installmentsCount, setInstallmentsCount] = useState(6);
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);

  // cargo_unico
  const [singleAmount, setSingleAmount] = useState(0);

  // suscripcion
  const [breakdown, setBreakdown] = useState<{ label: string; amount: number }[]>([]);
  const [billingDay, setBillingDay] = useState(defaultBillingDay);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(defaultStartDate);

  const servicesInCategory = useMemo(
    () => services.filter((s) => s.category_id === categoryId),
    [services, categoryId]
  );

  const pickableServices = useMemo(
    () =>
      servicesInCategory.filter((s) =>
        itemType === "suscripcion" ? s.type === "recurrente" : s.type === "unico"
      ),
    [servicesInCategory, itemType]
  );

  function resetTypeFields() {
    setError(null);
    setServiceId(null);
    setDescription("");
  }

  function handleTypeChange(value: ContractItemType) {
    setItemType(value);
    resetTypeFields();
  }

  function applyService(service: ServiceOption) {
    setServiceId(service.id);
    setDescription(service.name);
    setCurrency(service.currency);
    if (itemType === "equipo_financiado") setTotalAmount(service.base_price);
    if (itemType === "cargo_unico") setSingleAmount(service.base_price);
  }

  function addBreakdownFromService(service: ServiceOption) {
    setServiceId(service.id);
    if (!description) setDescription("Suscripción");
    setCurrency(service.currency);
    setBreakdown((prev) => [...prev, { label: service.name, amount: service.base_price }]);
  }

  function addManualBreakdownLine() {
    setBreakdown((prev) => [...prev, { label: "", amount: 0 }]);
  }

  function updateBreakdownLine(index: number, patch: Partial<{ label: string; amount: number }>) {
    setBreakdown((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeBreakdownLine(index: number) {
    setBreakdown((prev) => prev.filter((_, i) => i !== index));
  }

  const monthlyTotal = breakdown.reduce((sum, line) => sum + (line.amount || 0), 0);

  function handleAdd() {
    let candidate: ContractItemFormValues;

    if (itemType === "equipo_financiado") {
      candidate = {
        item_type: "equipo_financiado",
        service_id: serviceId,
        description,
        currency,
        total_amount: totalAmount,
        down_payment: downPayment,
        installments_count: installmentsCount,
        inventory_item_id: inventoryItemId,
      };
    } else if (itemType === "cargo_unico") {
      candidate = {
        item_type: "cargo_unico",
        service_id: serviceId,
        description,
        currency,
        single_amount: singleAmount,
      };
    } else {
      candidate = {
        item_type: "suscripcion",
        service_id: serviceId,
        description: description || "Suscripción",
        currency,
        subscription_breakdown: breakdown,
        billing_day: billingDay,
        subscription_start_date: subscriptionStartDate,
      };
    }

    const parsed = contractItemSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    onAdd(parsed.data);

    // reset para poder cargar otro ítem
    setDescription("");
    setServiceId(null);
    setTotalAmount(0);
    setDownPayment(0);
    setInstallmentsCount(6);
    setInventoryItemId(null);
    setSingleAmount(0);
    setBreakdown([]);
    setBillingDay(1);
    setSubscriptionStartDate(defaultStartDate);
    setError(null);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo de ítem</Label>
            <Select value={itemType} onValueChange={(v) => handleTypeChange(v as ContractItemType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_ITEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ITEM_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {pickableServices.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label>Servicios del catálogo (opcional)</Label>
            <div className="flex flex-wrap gap-2">
              {pickableServices.map((service) => (
                <Button
                  key={service.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    itemType === "suscripcion"
                      ? addBreakdownFromService(service)
                      : applyService(service)
                  }
                >
                  <Plus className="size-3.5" />
                  {service.name} ({formatCurrency(service.base_price, service.currency)})
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as "ARS" | "USD")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {itemType === "equipo_financiado" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Monto total</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Entrega inicial</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Cuotas (máx. 6)</Label>
                <Input
                  type="number"
                  min="1"
                  max="6"
                  value={installmentsCount}
                  onChange={(e) =>
                    setInstallmentsCount(Math.min(6, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Financiado: {formatCurrency(Math.max(0, totalAmount - downPayment), currency)} en{" "}
              {installmentsCount} {installmentsCount === 1 ? "cuota" : "cuotas"} de{" "}
              {formatCurrency(Math.max(0, totalAmount - downPayment) / installmentsCount, currency)}{" "}
              aprox.
            </p>

            <div className="flex flex-col gap-1.5 rounded-lg border border-dashed p-3">
              <Label className="text-muted-foreground">
                Equipo de stock (número de serie)
              </Label>
              <Select
                value={inventoryItemId ?? "none"}
                onValueChange={(v) => setInventoryItemId(v === "none" ? null : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccioná un equipo disponible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar todavía</SelectItem>
                  {availableInventory.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.product_name} — {option.serial_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {itemType === "cargo_unico" && (
          <div className="flex flex-col gap-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={singleAmount}
              onChange={(e) => setSingleAmount(Number(e.target.value) || 0)}
              className="max-w-48"
            />
          </div>
        )}

        {itemType === "suscripcion" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Conceptos incluidos</Label>
              {breakdown.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Agregá conceptos desde el catálogo arriba o cargá uno manual.
                </p>
              )}
              {breakdown.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={line.label}
                    placeholder="Concepto"
                    onChange={(e) => updateBreakdownLine(index, { label: e.target.value })}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) =>
                      updateBreakdownLine(index, { amount: Number(e.target.value) || 0 })
                    }
                    className="max-w-36"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeBreakdownLine(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addManualBreakdownLine}>
                <Plus className="size-3.5" />
                Línea manual
              </Button>
              <p className="text-sm font-medium">
                Total mensual al cliente: {formatCurrency(monthlyTotal, currency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Día de facturación</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={billingDay}
                  onChange={(e) =>
                    setBillingDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Inicio de suscripción</Label>
                <Input
                  type="date"
                  value={subscriptionStartDate}
                  onChange={(e) => setSubscriptionStartDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <Button type="button" onClick={handleAdd}>
            <Plus />
            Agregar ítem
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
