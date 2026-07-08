"use client";

import { useMemo, useState } from "react";
import { Boxes, History, Plus, Search, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ProductDialog } from "@/components/stock/product-dialog";
import { ProductStockCard } from "@/components/stock/product-stock-card";
import { InventoryStatusBadge } from "@/components/stock/inventory-status-badge";
import { ManageItemDialog } from "@/components/stock/manage-item-dialog";
import { InventoryHistoryDialog } from "@/components/stock/inventory-history-dialog";
import type { Product } from "@/lib/types/product";
import type { InventoryItemWithProduct } from "@/lib/types/inventory";

export function StockView({
  products,
  items,
}: {
  products: Product[];
  items: InventoryItemWithProduct[];
}) {
  const [query, setQuery] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product>();
  const [managingItem, setManagingItem] = useState<InventoryItemWithProduct>();
  const [historyItem, setHistoryItem] = useState<InventoryItemWithProduct>();

  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return items.filter(
      (item) =>
        item.serial_number.toLowerCase().includes(term) ||
        item.manufacturer_number?.toLowerCase().includes(term)
    );
  }, [items, query]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
          <p className="text-sm text-muted-foreground">
            Inventario serializado por número de serie.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(undefined);
            setProductDialogOpen(true);
          }}
        >
          <Plus />
          Nuevo producto
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por número de serie o MAC..."
          className="pl-8"
        />
      </div>

      {searchResults ? (
        searchResults.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Sin resultados"
            description="Ningún equipo coincide con esa búsqueda."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.serial_number}</TableCell>
                    <TableCell>{item.product.name}</TableCell>
                    <TableCell>
                      <InventoryStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.client ? `${item.client.first_name} ${item.client.last_name}` : "—"}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Todavía no hay productos"
          description="Creá el primer modelo de equipo para empezar a cargar unidades con su número de serie."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductStockCard
              key={product.id}
              product={product}
              items={items.filter((i) => i.product_id === product.id)}
              onEditProduct={() => {
                setEditingProduct(product);
                setProductDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        product={editingProduct}
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
    </div>
  );
}
