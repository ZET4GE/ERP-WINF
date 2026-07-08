export const CLIENT_STATUSES = ["activo", "moroso", "potencial", "inactivo"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  dni: string | null;
  cuit_cuil: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string;
  status: ClientStatus;
  lat: number | null;
  lng: number | null;
  internal_notes: string | null;
  deleted_at: string | null;
  created_at: string;
}
