import { z } from "zod";

import { DOCUMENT_TYPES } from "@/lib/types/document";

const CURRENCIES = ["ARS", "USD"] as const;

export const documentItemSchema = z.object({
  description: z.string().min(1, "Requerido"),
  quantity: z.number().positive("Debe ser mayor a 0"),
  unit_price: z.number().nonnegative("No puede ser negativo"),
});

export const documentSchema = z
  .object({
    doc_type: z.enum(DOCUMENT_TYPES),
    client_id: z.string().nullable(),
    contract_id: z.string().nullable().optional(),
    manual_client_name: z.string().optional(),
    manual_client_contact: z.string().optional(),
    manual_client_address: z.string().optional(),
    issued_at: z.string().min(1, "Requerido"),
    valid_until: z.string().optional(),
    currency: z.enum(CURRENCIES),
    items: z.array(documentItemSchema),
    body: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.client_id || (data.manual_client_name?.trim().length ?? 0) > 0, {
    message: "Seleccioná un cliente o cargá los datos manuales",
    path: ["manual_client_name"],
  })
  .refine(
    (data) => data.doc_type !== "informe_tecnico" || (data.body?.trim().length ?? 0) > 0,
    { message: "El informe técnico necesita contenido", path: ["body"] }
  )
  .refine(
    (data) => data.doc_type === "informe_tecnico" || data.items.length > 0,
    { message: "Agregá al menos un ítem", path: ["items"] }
  );

export type DocumentFormValues = z.infer<typeof documentSchema>;
