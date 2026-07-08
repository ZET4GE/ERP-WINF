export const SERVICE_TYPES = ["unico", "recurrente"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface ServiceCategory {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  type: ServiceType;
  base_price: number;
  currency: Currency;
  description: string | null;
  active: boolean;
  created_at: string;
}
