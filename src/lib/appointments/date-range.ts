import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from "date-fns";

export type AgendaView = "month" | "week" | "day";

export function getAgendaRange(view: AgendaView, date: Date) {
  if (view === "month") {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    return {
      rangeStart: startOfWeek(monthStart, { weekStartsOn: 1 }),
      rangeEnd: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    };
  }
  if (view === "week") {
    return {
      rangeStart: startOfWeek(date, { weekStartsOn: 1 }),
      rangeEnd: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }
  return { rangeStart: startOfDay(date), rangeEnd: endOfDay(date) };
}
