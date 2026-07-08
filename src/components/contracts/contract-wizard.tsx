"use client";

import { useState, useTransition } from "react";
import { Building2, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { createContract, searchClients } from "@/app/(dashboard)/contratos/actions";
import type { ContractItemFormValues } from "@/lib/contracts/schema";
import {
  ContractItemForm,
  type CategoryOption,
  type ServiceOption,
  type InventoryOption,
} from "@/components/contracts/contract-item-form";

type ClientOption = {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  city: string | null;
};

const ITEM_TYPE_LABEL: Record<ContractItemFormValues["item_type"], string> = {
  equipo_financiado: "Equipo financiado",
  cargo_unico: "Cargo único",
  suscripcion: "Suscripción",
};

function itemTotal(item: ContractItemFormValues) {
  if (item.item_type === "equipo_financiado") return item.total_amount;
  if (item.item_type === "cargo_unico") return item.single_amount;
  return item.subscription_breakdown.reduce((sum, line) => sum + line.amount, 0);
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ContractWizard({
  categories,
  services,
  availableInventory,
  initialClient,
  initialItems,
  defaultCurrency,
  defaultBillingDay,
}: {
  categories: CategoryOption[];
  services: ServiceOption[];
  availableInventory: InventoryOption[];
  initialClient?: ClientOption;
  initialItems?: ContractItemFormValues[];
  defaultCurrency?: "ARS" | "USD";
  defaultBillingDay?: number;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(
    initialClient ? (initialItems?.length ? 3 : 2) : 1
  );
  const [isPending, startTransition] = useTransition();

  // paso 1: cliente
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [searching, startSearch] = useTransition();
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    initialClient ?? null
  );

  // paso 2: ítems
  const [items, setItems] = useState<ContractItemFormValues[]>(initialItems ?? []);

  // paso 3: resumen
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [scheduleInstallation, setScheduleInstallation] = useState(false);
  const [installStartAt, setInstallStartAt] = useState(`${todayISO()}T09:00`);
  const [installEndAt, setInstallEndAt] = useState(`${todayISO()}T11:00`);

  function handleSearch(value: string) {
    setQuery(value);
    startSearch(async () => {
      const clients = await searchClients(value);
      setResults(clients);
    });
  }

  function handleSubmit() {
    if (!selectedClient) return;
    startTransition(async () => {
      const result = await createContract({
        client_id: selectedClient.id,
        title,
        start_date: startDate,
        notes,
        items,
        schedule_installation: scheduleInstallation
          ? {
              start_at: new Date(installStartAt).toISOString(),
              end_at: new Date(installEndAt).toISOString(),
            }
          : null,
      });
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={step === 1 ? "font-medium text-foreground" : ""}>1. Cliente</span>
        <span>→</span>
        <span className={step === 2 ? "font-medium text-foreground" : ""}>2. Ítems</span>
        <span>→</span>
        <span className={step === 3 ? "font-medium text-foreground" : ""}>3. Resumen</span>
      </div>

      {step === 1 && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar cliente por nombre o razón social..."
                className="pl-8"
              />
            </div>

            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <div>
                  <p className="text-sm font-medium">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </p>
                  {selectedClient.business_name && (
                    <p className="text-xs text-muted-foreground">{selectedClient.business_name}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="flex flex-col divide-y rounded-lg border">
                {searching && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Buscando...
                  </div>
                )}
                {!searching && results.length === 0 && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Building2 className="size-4" /> Escribí para buscar un cliente
                  </div>
                )}
                {results.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="flex flex-col items-start gap-0.5 p-3 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">
                      {client.first_name} {client.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[client.business_name, client.city].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div>
              <Button disabled={!selectedClient} onClick={() => setStep(2)}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <ContractItemForm
            categories={categories}
            services={services}
            availableInventory={availableInventory}
            defaultStartDate={startDate}
            defaultCurrency={defaultCurrency}
            defaultBillingDay={defaultBillingDay}
            onAdd={(item) => setItems((prev) => [...prev, item])}
          />

          {items.length > 0 && (
            <Card>
              <CardContent className="flex flex-col divide-y pt-6">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">
                        {ITEM_TYPE_LABEL[item.item_type]} — {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(itemTotal(item), item.currency)}
                        {item.item_type === "suscripcion" && " / mes"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Volver
            </Button>
            <Button disabled={items.length === 0} onClick={() => setStep(3)}>
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 3 && selectedClient && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Tipo de plan / título</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='Ej. "Residencial Lite"'
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fecha de instalación</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label>¿Agendar instalación?</Label>
                <Switch
                  checked={scheduleInstallation}
                  onCheckedChange={(checked) => {
                    setScheduleInstallation(checked);
                    if (checked) {
                      setInstallStartAt(`${startDate}T09:00`);
                      setInstallEndAt(`${startDate}T11:00`);
                    }
                  }}
                />
              </div>
              {scheduleInstallation && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Inicio</Label>
                    <Input
                      type="datetime-local"
                      value={installStartAt}
                      onChange={(e) => setInstallStartAt(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Fin</Label>
                    <Input
                      type="datetime-local"
                      value={installEndAt}
                      onChange={(e) => setInstallEndAt(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">
                {selectedClient.first_name} {selectedClient.last_name}
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>
                      {ITEM_TYPE_LABEL[item.item_type]} — {item.description}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(itemTotal(item), item.currency)}
                      {item.item_type === "suscripcion" && " /mes"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Volver
              </Button>
              <Button disabled={!title || isPending} onClick={handleSubmit}>
                {isPending ? "Creando..." : "Crear contrato"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
