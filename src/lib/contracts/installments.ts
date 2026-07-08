function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function daysInUTCMonth(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

// Suma meses en UTC (evita el corrimiento de un día que da `date-fns`
// cuando el Date de entrada quedó anclado a medianoche UTC pero el
// entorno corre en otro huso horario). Si el día de origen no existe en
// el mes destino (ej. 31 de enero + 1 mes) lo recorta al último día.
function addUTCMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const totalMonths = month + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12;
  const clampedDay = Math.min(day, daysInUTCMonth(targetYear, targetMonth));

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

function formatUTCDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface InstallmentPlanEntry {
  number: number;
  amount: number;
  dueDate: string;
}

/**
 * Genera el plan de cuotas de un equipo financiado. El monto se reparte en
 * partes iguales redondeadas a 2 decimales; el resto de centavos por el
 * redondeo se absorbe en la última cuota para que la suma total cierre
 * exacto contra el monto financiado.
 */
export function generateInstallmentPlan({
  totalAmount,
  downPayment = 0,
  installmentsCount,
  startDate,
}: {
  totalAmount: number;
  downPayment?: number;
  installmentsCount: number;
  startDate: Date;
}): InstallmentPlanEntry[] {
  const financedAmount = round2(totalAmount - downPayment);
  if (installmentsCount < 1 || financedAmount <= 0) return [];

  const baseAmount = Math.floor((financedAmount / installmentsCount) * 100) / 100;

  const plan: InstallmentPlanEntry[] = [];
  let accumulated = 0;

  for (let number = 1; number <= installmentsCount; number++) {
    const isLast = number === installmentsCount;
    const amount = isLast ? round2(financedAmount - accumulated) : baseAmount;
    accumulated = round2(accumulated + amount);

    plan.push({
      number,
      amount,
      dueDate: formatUTCDateOnly(addUTCMonths(startDate, number)),
    });
  }

  return plan;
}
