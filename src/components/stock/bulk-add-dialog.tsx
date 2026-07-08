"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bulkAddInventoryItems } from "@/app/(dashboard)/stock/actions";

export function BulkAddDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}) {
  const [rawSerials, setRawSerials] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) setRawSerials("");
    onOpenChange(next);
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await bulkAddInventoryItems({
        product_id: productId,
        raw_serials: rawSerials,
      });

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar equipos — {productName}</DialogTitle>
          <DialogDescription>
            Un número de serie por línea. Opcional: agregá el número de
            fabricante/MAC separado por coma (ej. &quot;SN12345, AA:BB:CC:DD&quot;).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>Números de serie</Label>
          <Textarea
            rows={8}
            value={rawSerials}
            onChange={(e) => setRawSerials(e.target.value)}
            placeholder={"SN0001\nSN0002, AA:BB:CC:DD:EE:FF"}
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || !rawSerials.trim()}>
            {isPending ? "Agregando..." : "Agregar al stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
