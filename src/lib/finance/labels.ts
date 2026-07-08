import type { TransactionOrigin, TransactionType } from "@/lib/types/finance";

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  ingreso: "Ingreso",
  egreso: "Egreso",
};

export const TRANSACTION_ORIGIN_LABEL: Record<TransactionOrigin, string> = {
  cuota: "Cuota",
  suscripcion: "Suscripción",
  cargo_unico: "Cargo único",
  venta: "Venta",
  gasto_manual: "Gasto manual",
  gasto_recurrente: "Gasto recurrente",
};
