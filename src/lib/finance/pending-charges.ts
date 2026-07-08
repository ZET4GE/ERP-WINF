// Función pura (sin Supabase) que junta installments + subscription_charges
// en estado 'pendiente'/'vencida' en una sola lista para la vista de
// "cuotas pendientes de pago" en Finanzas. Recibe los datos ya leídos de la
// base como parámetros para poder testearla sin credenciales reales.

export interface PendingChargeSource {
  id: string;
  table: "installments" | "subscription_charges";
  status: string;
  dueDate: string; // "yyyy-MM-dd"
  amount: number;
  currency: "ARS" | "USD";
  description: string;
  clientId: string;
  clientName: string;
  phone: string | null;
}

export interface PendingCharge extends PendingChargeSource {
  overdueDays: number; // 0 si todavía no venció
}

function daysBetween(fromDateOnly: string, toDateOnly: string): number {
  const from = new Date(`${fromDateOnly}T00:00:00Z`);
  const to = new Date(`${toDateOnly}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Ordena por vencimiento ascendente (lo más vencido primero) y calcula
 * cuántos días de atraso tiene cada una respecto de `today`.
 */
export function buildPendingCharges(
  sources: PendingChargeSource[],
  today: string
): PendingCharge[] {
  return sources
    .map((s) => ({ ...s, overdueDays: Math.max(0, daysBetween(s.dueDate, today)) }))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
}
