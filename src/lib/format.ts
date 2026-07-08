import { format } from "date-fns";
import { es } from "date-fns/locale";

export function formatCurrency(amount: number, currency: "ARS" | "USD" = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Las columnas `date` de Postgres llegan como "yyyy-MM-dd" sin hora. Parsearlas
// con `new Date(string)` las ancla a medianoche UTC y, al formatear en un huso
// horario detrás de UTC (ej. Argentina), muestran el día anterior. Se parsean
// como fecha local para que "vence 01/02/2026" sea siempre 01/02/2026.
export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDate(date: string | Date) {
  const d = typeof date === "string" ? parseDateOnly(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function formatTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm", { locale: es });
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}
