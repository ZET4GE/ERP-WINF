export const INVENTORY_STATUSES = ["en_stock", "asignado", "instalado", "rma", "baja"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export interface InventoryItem {
  id: string;
  product_id: string;
  serial_number: string;
  manufacturer_number: string | null;
  status: InventoryStatus;
  client_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  from_status: InventoryStatus | null;
  to_status: InventoryStatus;
  notes: string | null;
  created_at: string;
  client: { id: string; first_name: string; last_name: string } | null;
  user: { id: string; full_name: string } | null;
}

export interface InventoryItemWithProduct extends InventoryItem {
  product: { id: string; name: string; category: string | null };
  client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
}
