export const DOCUMENT_TYPES = [
  "presupuesto",
  "informe_tecnico",
  "remito_ot",
  "comprobante",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = ["borrador", "enviado", "aceptado", "vencido"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface DocumentItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Document {
  id: string;
  doc_type: DocumentType;
  number: string;
  client_id: string | null;
  contract_id: string | null;
  manual_client_name: string | null;
  manual_client_contact: string | null;
  manual_client_address: string | null;
  issued_at: string;
  valid_until: string | null;
  currency: "ARS" | "USD";
  status: DocumentStatus;
  items: DocumentItem[];
  body: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  pdf_url: string | null;
  created_at: string;
}

export interface DocumentWithRelations extends Document {
  client: { id: string; first_name: string; last_name: string; business_name: string | null } | null;
  contract: { id: string; title: string } | null;
}
