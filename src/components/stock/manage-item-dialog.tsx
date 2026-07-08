"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { manageInventoryItem } from "@/app/(dashboard)/stock/actions";
import { searchClients } from "@/app/(dashboard)/contratos/actions";
import { secondaryFieldLabel } from "@/components/stock/bulk-add-dialog";
import { INVENTORY_STATUSES, type InventoryStatus } from "@/lib/types/inventory";
import { INVENTORY_STATUS_LABEL } from "@/components/stock/inventory-status-badge";
import type { InventoryItemWithProduct } from "@/lib/types/inventory";

type ClientOption = { id: string; first_name: string; last_name: string; business_name: string | null };

export function ManageItemDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItemWithProduct;
}) {
  const [serialNumber, setSerialNumber] = useState(item.serial_number);
  const [manufacturerNumber, setManufacturerNumber] = useState(item.manufacturer_number ?? "");
  const [status, setStatus] = useState<InventoryStatus>(item.status);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(item.client);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [notes, setNotes] = useState("");
  const [searching, startSearch] = useTransition();
  const [isPending, startTransition] = useTransition();

  const secondaryLabel = secondaryFieldLabel(item.product.category);

  useEffect(() => {
    if (open) {
      setSerialNumber(item.serial_number);
      setManufacturerNumber(item.manufacturer_number ?? "");
      setStatus(item.status);
      setSelectedClient(item.client);
      setQuery("");
      setResults([]);
      setNotes("");
    }
  }, [open, item]);

  function handleSearch(value: string) {
    setQuery(value);
    startSearch(async () => {
      const clients = await searchClients(value);
      setResults(clients);
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await manageInventoryItem(item.id, {
        serial_number: serialNumber,
        manufacturer_number: manufacturerNumber,
        status,
        client_id: status === "en_stock" ? null : selectedClient?.id ?? null,
        notes,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Equipo actualizado");
      onOpenChange(false);
    });
  }

  const needsClient = status !== "en_stock";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar equipo — {item.serial_number}</DialogTitle>
          <DialogDescription>{item.product.name}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>S/N</Label>
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{secondaryLabel}</Label>
              <Input
                value={manufacturerNumber}
                onChange={(e) => setManufacturerNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InventoryStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {INVENTORY_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsClient && (
            <div className="flex flex-col gap-1.5">
              <Label>Cliente {status === "asignado" && "(requerido)"}</Label>
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
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      className="pl-8"
                    />
                  </div>
                  <div className="flex flex-col divide-y rounded-lg border">
                    {searching && (
                      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Buscando...
                      </div>
                    )}
                    {!searching &&
                      results.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => setSelectedClient(client)}
                          className="flex flex-col items-start gap-0.5 p-3 text-left text-sm hover:bg-muted/50"
                        >
                          <span className="font-medium">
                            {client.first_name} {client.last_name}
                          </span>
                          {client.business_name && (
                            <span className="text-xs text-muted-foreground">
                              {client.business_name}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending || !serialNumber.trim() || (status === "asignado" && !selectedClient)
            }
          >
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
