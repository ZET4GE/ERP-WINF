export const CONTRACT_STATUSES = ["activo", "pausado", "finalizado", "cancelado"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_ITEM_TYPES = ["equipo_financiado", "cargo_unico", "suscripcion"] as const;
export type ContractItemType = (typeof CONTRACT_ITEM_TYPES)[number];

export const CHARGE_STATUSES = ["pendiente", "pagada", "vencida"] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const PAYMENT_METHODS = ["efectivo", "transferencia", "mercadopago"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Contract {
  id: string;
  client_id: string;
  title: string;
  status: ContractStatus;
  start_date: string;
  notes: string | null;
  created_at: string;
}

export interface SubscriptionBreakdownLine {
  label: string;
  amount: number;
}

export interface ContractItem {
  id: string;
  contract_id: string;
  item_type: ContractItemType;
  service_id: string | null;
  description: string;
  currency: "ARS" | "USD";
  total_amount: number | null;
  down_payment: number | null;
  installments_count: number | null;
  inventory_item_id: string | null;
  single_amount: number | null;
  monthly_amount: number | null;
  subscription_breakdown: SubscriptionBreakdownLine[] | null;
  billing_day: number | null;
  subscription_start_date: string | null;
  created_at: string;
}

export interface Installment {
  id: string;
  contract_item_id: string;
  number: number;
  amount: number;
  due_date: string;
  status: ChargeStatus;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  created_at: string;
}

export interface SubscriptionCharge {
  id: string;
  contract_item_id: string;
  period: string;
  amount: number;
  status: ChargeStatus;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  created_at: string;
}

export interface ContractItemWithCharges extends ContractItem {
  service: { id: string; name: string; category_id: string; category: { id: string; name: string } | null } | null;
  installments: Installment[];
  subscription_charges: SubscriptionCharge[];
}

export interface ContractWithRelations extends Contract {
  client: { id: string; first_name: string; last_name: string; business_name: string | null };
  items: ContractItemWithCharges[];
}
