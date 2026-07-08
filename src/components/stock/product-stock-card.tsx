"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, History, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InventoryStatusBadge } from "@/components/stock/inventory-status-badge";
import { BulkAddDialog, secondaryFieldLabel } from "@/components/stock/bulk-add-dialog";
import { ManageItemDialog } from "@/components/stock/manage-item-dialog";
import { InventoryHistoryDialog } from "@/components/stock/inventory-history-dialog";
import { deleteInventoryItem } from "@/app/(dashboard)/stock/actions";
import { formatCurrency } from "@/lib/format";
import { INVENTORY_STATUSES } from "@/lib/types/inventory";
import type { Product } from "@/lib/types/product";
import type { InventoryItemWithProduct } from "@/lib/types/inventory";

export function ProductStockCard({
  product,
  items,
  onEditProduct,
}: {
  product: Product;
  items: InventoryItemWithProduct[];
  onEditProduct: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [managingItem, setManagingItem] = useState<InventoryItemWithProduct>();
  const [historyItem, setHistoryItem] = useState<InventoryItemWithProduct>();
  const [isDeleting, startDelete] = useTransition();

  function handleDelete(itemId: string) {
    startDelete(async () => {
      const result = await deleteInventoryItem(itemId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Equipo eliminado");
    });
  }

  const availableCount = items.filter((i) => i.status === "en_stock").length;
  const lowStock = availableCount < product.min_stock_threshold;

  const counts = Object.fromEntries(
    INVENTORY_STATUSES.map((status) => [
      status,
      items.filter((i) => i.status === status).length,
    ])
  ) as Record<string, number>;

  return (
    <Card className={lowStock ? "border-destructive/40" : undefined}>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {product.name}
            {lowStock && (
              <span title="Stock disponible por debajo del mínimo">
                <AlertTriangle className="size-4 text-destructive" />
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {product.category ?? "Sin categoría"} ·{" "}
            {formatCurrency(product.sale_price, product.currency)}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onEditProduct}>
          <Settings2 />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {INVENTORY_STATUSES.filter((status) => counts[status] > 0).map((status) => (
            <div key={status} className="flex items-center gap-1">
              <InventoryStatusBadge status={status} />
              <span className="text-xs text-muted-foreground">{counts[status]}</span>
            </div>
          ))}
          {items.length === 0 && (
            <span className="text-sm text-muted-foreground">Sin equipos cargados todavía.</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Disponible: {availableCount}
          {product.min_stock_threshold > 0 && ` (mínimo: ${product.min_stock_threshold})`}
        </p>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Ocultar equipos" : `Ver equipos (${items.length})`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkAddOpen(true)}>
            <Plus className="size-3.5" />
            Agregar equipos
          </Button>
        </div>

        {expanded && (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>{secondaryFieldLabel(product.category)}</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Sin equipos cargados.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.serial_number}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.manufacturer_number || "—"}
                      </TableCell>
                      <TableCell>
                        <InventoryStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.client
                          ? `${item.client.first_name} ${item.client.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Gestionar"
                            onClick={() => setManagingItem(item)}
                          >
                            <Settings2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Historial"
                            onClick={() => setHistoryItem(item)}
                          >
                            <History className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Eliminar"
                                  disabled={isDeleting}
                                />
                              }
                            >
                              <Trash2 className="size-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará el equipo con S/N &quot;{item.serial_number}&quot;
                                  y su historial de movimientos. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={isDeleting}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <BulkAddDialog
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        productId={product.id}
        productName={product.name}
        productCategory={product.category}
      />

      {managingItem && (
        <ManageItemDialog
          open={!!managingItem}
          onOpenChange={(v) => !v && setManagingItem(undefined)}
          item={managingItem}
        />
      )}

      {historyItem && (
        <InventoryHistoryDialog
          open={!!historyItem}
          onOpenChange={(v) => !v && setHistoryItem(undefined)}
          itemId={historyItem.id}
          serialNumber={historyItem.serial_number}
        />
      )}
    </Card>
  );
}
