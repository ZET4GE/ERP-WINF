import { z } from "zod";

import { TICKET_PRIORITIES } from "@/lib/types/ticket";

export const ticketSchema = z.object({
  client_id: z.string().min(1, "Seleccioná un cliente"),
  inventory_item_id: z.string().nullable(),
  subject: z.string().min(1, "Requerido"),
  description: z.string().optional(),
  priority: z.enum(TICKET_PRIORITIES),
});

export type TicketFormValues = z.infer<typeof ticketSchema>;

export const ticketUpdateSchema = z.object({
  note: z.string().min(1, "La nota no puede estar vacía"),
});

export type TicketUpdateFormValues = z.infer<typeof ticketUpdateSchema>;

export const resolveTicketSchema = z.object({
  solution_applied: z.string().min(1, "Describí la solución aplicada"),
  time_spent_minutes: z.number().positive("Debe ser mayor a 0"),
});

export type ResolveTicketFormValues = z.infer<typeof resolveTicketSchema>;
