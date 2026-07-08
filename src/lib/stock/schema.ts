import { z } from "zod";

import { CURRENCIES } from "@/lib/types/service";
import { INVENTORY_STATUSES } from "@/lib/types/inventory";

export const productSchema = z.object({
  name: z.string().min(1, "Requerido"),
  category: z.string().optional(),
  cost: z.number().nonnegative("Debe ser positivo"),
  sale_price: z.number().nonnegative("Debe ser positivo"),
  currency: z.enum(CURRENCIES),
  min_stock_threshold: z.number().int().nonnegative("Debe ser positivo"),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const bulkAddEntrySchema = z.object({
  serial: z.string().min(1, "Requerido"),
  manufacturer: z.string().optional(),
});

export const bulkAddSchema = z.object({
  product_id: z.string().min(1, "Requerido"),
  entries: z.array(bulkAddEntrySchema).min(1, "Agregá al menos un equipo"),
});

export type BulkAddEntryValues = z.infer<typeof bulkAddEntrySchema>;
export type BulkAddFormValues = z.infer<typeof bulkAddSchema>;

export const manageItemSchema = z
  .object({
    status: z.enum(INVENTORY_STATUSES),
    client_id: z.string().nullable(),
    notes: z.string().optional(),
  })
  .refine((data) => data.status !== "asignado" || !!data.client_id, {
    message: "Seleccioná un cliente para asignar el equipo",
    path: ["client_id"],
  });

export type ManageItemFormValues = z.infer<typeof manageItemSchema>;
