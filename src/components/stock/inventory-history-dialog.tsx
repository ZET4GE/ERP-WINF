"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryStatusBadge } from "@/components/stock/inventory-status-badge";
import { getInventoryHistory } from "@/app/(dashboard)/stock/actions";
import { formatDate } from "@/lib/format";
import type { InventoryMovement } from "@/lib/types/inventory";

export function InventoryHistoryDialog({
  open,
  onOpenChange,
  itemId,
  serialNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  serialNumber: string;
}) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getInventoryHistory(itemId)
      .then((data) => setMovements(data as unknown as InventoryMovement[]))
      .finally(() => setLoading(false));
  }, [open, itemId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial — {serialNumber}</DialogTitle>
          <DialogDescription>
            Trazabilidad completa del equipo para garantías y soporte.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando historial...
          </div>
        ) : movements.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Sin movimientos registrados.</p>
        ) : (
          <div className="flex flex-col divide-y">
            {movements.map((movement) => (
              <div key={movement.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {movement.from_status ? (
                    <>
                      <InventoryStatusBadge status={movement.from_status} />
                      <span className="text-muted-foreground">→</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Alta</span>
                  )}
                  <InventoryStatusBadge status={movement.to_status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(movement.created_at)}
                  {movement.user && ` · ${movement.user.full_name}`}
                  {movement.client && ` · ${movement.client.first_name} ${movement.client.last_name}`}
                </p>
                {movement.notes && <p className="text-sm">{movement.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
