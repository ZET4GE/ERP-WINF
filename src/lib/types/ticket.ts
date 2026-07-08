export const TICKET_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = ["abierto", "en_proceso", "resuelto", "cerrado"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface Ticket {
  id: string;
  client_id: string;
  inventory_item_id: string | null;
  subject: string;
  description: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  solution_applied: string | null;
  time_spent_minutes: number | null;
  created_at: string;
}

export interface TicketUpdate {
  id: string;
  ticket_id: string;
  author_id: string | null;
  note: string;
  created_at: string;
}

export interface TicketUpdateWithAuthor extends TicketUpdate {
  author: { id: string; full_name: string } | null;
}

export interface TicketWithRelations extends Ticket {
  client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
  inventory_item: { id: string; serial_number: string; product: { id: string; name: string } } | null;
}
