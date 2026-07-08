// Funciones puras (sin Supabase, sin IO) usadas por el cron mensual de
// Finanzas (`src/app/api/cron/monthly/route.ts`). Reciben los datos ya
// leídos de la base como parámetros y devuelven qué operaciones ejecutar,
// para poder testear la lógica (incluida la idempotencia) sin credenciales
// reales de Supabase.

export interface ActiveSubscriptionItem {
  id: string;
  monthlyAmount: number;
  currency: "ARS" | "USD";
}

export interface ExistingSubscriptionCharge {
  contractItemId: string;
  period: string;
}

export interface SubscriptionChargeToInsert {
  contractItemId: string;
  period: string;
  amount: number;
  currency: "ARS" | "USD";
}

/**
 * Dado el período actual ("yyyy-MM-01") y la lista de contract_items activos
 * de tipo 'suscripcion' (contrato padre en status 'activo'), devuelve los
 * subscription_charges que faltan crear para ese período: uno por
 * contract_item que todavía no tenga charge para ese (contract_item_id, period).
 *
 * Idempotente: si se le pasa la lista de charges ya existentes (incluyendo
 * los recién insertados en una corrida anterior este mismo mes), no vuelve a
 * proponerlos.
 */
export function computeSubscriptionChargesToCreate(
  period: string,
  activeSubscriptionItems: ActiveSubscriptionItem[],
  existingCharges: ExistingSubscriptionCharge[]
): SubscriptionChargeToInsert[] {
  const existingKeys = new Set(
    existingCharges.map((charge) => `${charge.contractItemId}::${charge.period}`)
  );

  return activeSubscriptionItems
    .filter((item) => !existingKeys.has(`${item.id}::${period}`))
    .map((item) => ({
      contractItemId: item.id,
      period,
      amount: item.monthlyAmount,
      currency: item.currency,
    }));
}

export interface ActiveRecurringExpense {
  id: string;
  amount: number;
  currency: "ARS" | "USD";
  categoryId: string | null;
  contractId: string | null;
}

export interface ExistingRecurringExpenseTransaction {
  recurringExpenseId: string;
}

export interface RecurringExpenseTransactionToInsert {
  recurringExpenseId: string;
  amount: number;
  currency: "ARS" | "USD";
  categoryId: string | null;
}

/**
 * Dada la lista de recurring_expenses activos y la lista de transactions ya
 * existentes este mes (origin='gasto_recurrente'), devuelve los egresos que
 * faltan generar: uno por recurring_expense que todavía no tenga transaction
 * este mes.
 *
 * Idempotente: si se le pasan las transactions ya insertadas en una corrida
 * anterior este mismo mes, no vuelve a proponerlas.
 */
export function computeRecurringExpenseTransactionsToCreate(
  activeRecurringExpenses: ActiveRecurringExpense[],
  existingTransactionsThisMonth: ExistingRecurringExpenseTransaction[]
): RecurringExpenseTransactionToInsert[] {
  const existingIds = new Set(
    existingTransactionsThisMonth.map((tx) => tx.recurringExpenseId)
  );

  return activeRecurringExpenses
    .filter((expense) => !existingIds.has(expense.id))
    .map((expense) => ({
      recurringExpenseId: expense.id,
      amount: expense.amount,
      currency: expense.currency,
      categoryId: expense.categoryId,
    }));
}

export interface PendingInstallment {
  id: string;
  dueDate: string;
}

export interface PendingSubscriptionCharge {
  id: string;
  period: string;
}

export interface OverdueMarkResult {
  installmentIds: string[];
  subscriptionChargeIds: string[];
}

/**
 * Dada la fecha de hoy ("yyyy-MM-dd"), las installments pendientes (id,
 * due_date) y los subscription_charges pendientes (id, period), devuelve
 * cuáles hay que marcar 'vencida':
 * - installments: due_date < hoy.
 * - subscription_charges: period < primer día del mes actual.
 *
 * Comparación por string "yyyy-MM-dd" (orden lexicográfico == orden
 * cronológico), sin pasar por Date, para no reintroducir problemas de
 * huso horario.
 *
 * Idempotente: solo mira installments/charges que sigan en estado
 * 'pendiente' (filtrado antes de llegar acá); una vez marcados 'vencida' no
 * vuelven a aparecer en la lista de entrada en una corrida posterior.
 */
export function computeOverdueToMark(
  today: string,
  pendingInstallments: PendingInstallment[],
  pendingSubscriptionCharges: PendingSubscriptionCharge[]
): OverdueMarkResult {
  const currentMonthStart = `${today.slice(0, 7)}-01`;

  const installmentIds = pendingInstallments
    .filter((installment) => installment.dueDate < today)
    .map((installment) => installment.id);

  const subscriptionChargeIds = pendingSubscriptionCharges
    .filter((charge) => charge.period < currentMonthStart)
    .map((charge) => charge.id);

  return { installmentIds, subscriptionChargeIds };
}

/**
 * Dado un mapa de client_id -> cantidad total de vencidos (installments
 * vencidas + subscription_charges vencidas, ya reflejado en DB), devuelve
 * los client_ids que hay que pasar a 'moroso' (>= 2 vencidos).
 *
 * Idempotente en el sentido de que solo depende del conteo actual de
 * vencidos en DB: si ya está en 'moroso' y se lo vuelve a marcar 'moroso',
 * el UPDATE resultante es un no-op a nivel de datos.
 */
export function computeClientsToMarkAsOverdue(
  overdueCountByClientId: Record<string, number>
): string[] {
  return Object.entries(overdueCountByClientId)
    .filter(([, count]) => count >= 2)
    .map(([clientId]) => clientId);
}
