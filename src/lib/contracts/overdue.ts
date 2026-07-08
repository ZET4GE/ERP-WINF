import type { ContractWithRelations } from "@/lib/types/contract";

function todayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOverdueDate(dateOnly: string): boolean {
  return dateOnly < todayDateOnly();
}

// Compara strings "yyyy-MM-dd" directamente (orden lexicográfico == orden
// cronológico en ese formato), sin pasar por Date para no reintroducir
// problemas de huso horario.
export function contractHasOverdueCharges(contract: ContractWithRelations): boolean {
  const today = todayDateOnly();
  return contract.items.some((item) => {
    const overdueInstallment = item.installments.some(
      (installment) => installment.status === "pendiente" && installment.due_date < today
    );
    const overdueCharge = item.subscription_charges.some(
      (charge) => charge.status === "pendiente" && charge.period < today
    );
    return overdueInstallment || overdueCharge;
  });
}
