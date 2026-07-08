"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkAddInventoryItems } from "@/app/(dashboard)/stock/actions";
import type { BulkAddEntryValues } from "@/lib/stock/schema";

function emptyEntry(): BulkAddEntryValues {
  return { serial: "", manufacturer: "" };
}

// El segundo dato de cada equipo cambia de sentido según el producto: en
// Starlink es el número de kit; en el resto (cámaras, redes, etc.) suele ser
// la MAC o el número de fabricante.
export function secondaryFieldLabel(category: string | null) {
  if (category?.toLowerCase().includes("starlink")) return "Número de kit";
  return "MAC / Nº de fabricante";
}

export function BulkAddDialog({
  open,
  onOpenChange,
  productId,
  productName,
  productCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productCategory: string | null;
}) {
  const [entries, setEntries] = useState<BulkAddEntryValues[]>([emptyEntry()]);
  const [isPending, startTransition] = useTransition();

  const secondaryLabel = secondaryFieldLabel(productCategory);

  function handleOpenChange(next: boolean) {
    if (!next) setEntries([emptyEntry()]);
    onOpenChange(next);
  }

  function updateEntry(index: number, field: keyof BulkAddEntryValues, value: string) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  function addRow() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function removeRow(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  const hasAtLeastOneSerial = entries.some((e) => e.serial.trim().length > 0);

  function handleSubmit() {
    startTransition(async () => {
      const result = await bulkAddInventoryItems({ product_id: productId, entries });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.created > 0) {
        toast.success(
          `${result.created} equipo${result.created === 1 ? "" : "s"} agregado${
            result.created === 1 ? "" : "s"
          } al stock`
        );
      }
      if (result.failed.length > 0) {
        toast.error(
          `No se pudieron cargar (¿repetidos?): ${result.failed.join(", ")}`
        );
      }
      if (result.failed.length === 0) handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar equipos — {productName}</DialogTitle>
          <DialogDescription>
            Cargá el número de serie y el {secondaryLabel.toLowerCase()} de cada
            equipo. Podés agregar varios a la vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Label className="text-xs text-muted-foreground">S/N</Label>
            <Label className="text-xs text-muted-foreground">{secondaryLabel}</Label>
            <span />
          </div>

          {entries.map((entry, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={entry.serial}
                onChange={(e) => updateEntry(index, "serial", e.target.value)}
                placeholder="Ej. SN0001"
              />
              <Input
                value={entry.manufacturer ?? ""}
                onChange={(e) => updateEntry(index, "manufacturer", e.target.value)}
                placeholder={`Ej. ${secondaryLabel}`}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeRow(index)}
                disabled={entries.length === 1}
                title="Quitar"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" className="self-start" onClick={addRow}>
            <Plus className="size-3.5" />
            Agregar otro equipo
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || !hasAtLeastOneSerial}>
            {isPending ? "Agregando..." : "Agregar al stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
