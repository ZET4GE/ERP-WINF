// Funciones puras (sin Supabase, sin IO) usadas por el cron diario de
// recordatorios (`src/app/api/cron/whatsapp-reminders/route.ts`). Reciben los
// datos ya leídos de la base como parámetros y devuelven a quién hay que
// recordarle qué, para poder testear la lógica sin credenciales reales. Sin
// imports de `@/...` a propósito (alias no resuelto por la config de vitest).

function formatCurrency(amount: number, currency: "ARS" | "USD") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Argentina no tiene horario de verano: UTC-3 todo el año. Se usa este
// offset fijo (en vez del huso horario del server, que en Vercel es UTC) para
// que "turno de mañana" se calcule según el calendario de Argentina.
const ARGENTINA_OFFSET_HOURS = 3;

export function toArgentinaDateOnly(iso: string): string {
  const date = new Date(new Date(iso).getTime() - ARGENTINA_OFFSET_HOURS * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface AppointmentForReminder {
  id: string;
  startAt: string;
  status: string;
}

/**
 * De los turnos del día (ya acotados por rango de fecha en la consulta),
 * devuelve los que corresponde recordar: en estado 'pendiente' o
 * 'confirmado', cuyo start_at cae en `tomorrowDateOnly` ("yyyy-MM-dd", fecha
 * de Argentina), y que todavía no tengan un recordatorio 'enviado' registrado.
 */
export function filterAppointmentsForReminder<T extends AppointmentForReminder>(
  appointments: T[],
  tomorrowDateOnly: string,
  alreadySentIds: Set<string>
): T[] {
  return appointments.filter((a) => {
    if (alreadySentIds.has(a.id)) return false;
    if (a.status !== "pendiente" && a.status !== "confirmado") return false;
    return toArgentinaDateOnly(a.startAt) === tomorrowDateOnly;
  });
}

export interface CuotaForReminder {
  id: string;
  table: "installments" | "subscription_charges";
  dueDate: string;
  status: string;
}

function daysBetween(fromDateOnly: string, toDateOnly: string): number {
  const from = new Date(`${fromDateOnly}T00:00:00Z`);
  const to = new Date(`${toDateOnly}T00:00:00Z`);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * De las cuotas/cargos pendientes, devuelve los que vencen dentro de
 * `daysBefore` días (incluye vencimiento hoy, no incluye ya vencidos) y que
 * todavía no tengan un recordatorio 'enviado' registrado.
 */
export function filterCuotasForReminder<T extends CuotaForReminder>(
  cuotas: T[],
  today: string,
  daysBefore: number,
  alreadySentIds: Set<string>
): T[] {
  return cuotas.filter((c) => {
    if (alreadySentIds.has(`${c.table}:${c.id}`)) return false;
    if (c.status !== "pendiente") return false;
    const diff = daysBetween(today, c.dueDate);
    return diff >= 0 && diff <= daysBefore;
  });
}

export function buildCuotaReminderMessage({
  clientFirstName,
  description,
  amount,
  currency,
  dueDate,
}: {
  clientFirstName: string;
  description: string;
  amount: number;
  currency: "ARS" | "USD";
  dueDate: string;
}) {
  const [year, month, day] = dueDate.split("-");
  const fecha = `${day}/${month}/${year}`;

  return `Hola ${clientFirstName}! Te recordamos que tenés una cuota de ${description} por ${formatCurrency(amount, currency)} con vencimiento el ${fecha} — WINF`;
}
