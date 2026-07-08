export const TRANSACTION_TYPES = ["ingreso", "egreso"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_ORIGINS = [
  "cuota",
  "suscripcion",
  "cargo_unico",
  "venta",
  "gasto_manual",
  "gasto_recurrente",
] as const;
export type TransactionOrigin = (typeof TRANSACTION_ORIGINS)[number];

export interface ExpenseCategory {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  category_id: string | null;
  contract_id: string | null;
  amount: number;
  currency: "ARS" | "USD";
  day_of_month: number;
  active: boolean;
  created_at: string;
}

export interface RecurringExpenseWithRelations extends RecurringExpense {
  category: { id: string; name: string } | null;
  contract: { id: string; title: string; client: { id: string; first_name: string; last_name: string } } | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  origin: TransactionOrigin;
  installment_id: string | null;
  subscription_charge_id: string | null;
  document_id: string | null;
  recurring_expense_id: string | null;
  category_id: string | null;
  amount: number;
  currency: "ARS" | "USD";
  date: string;
  description: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface TransactionWithRelations extends Transaction {
  category: { id: string; name: string } | null;
}
