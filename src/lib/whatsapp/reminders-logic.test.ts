import { describe, expect, it } from "vitest";

import {
  buildCuotaReminderMessage,
  filterAppointmentsForReminder,
  filterCuotasForReminder,
  toArgentinaDateOnly,
} from "./reminders-logic";

describe("toArgentinaDateOnly", () => {
  it("resta el offset fijo de Argentina (UTC-3) antes de tomar la fecha", () => {
    expect(toArgentinaDateOnly("2026-07-09T13:00:00.000Z")).toBe("2026-07-09");
    // 01:00 UTC del día 10 es 22:00 del día 9 en Argentina.
    expect(toArgentinaDateOnly("2026-07-10T01:00:00.000Z")).toBe("2026-07-09");
  });
});

describe("filterAppointmentsForReminder", () => {
  const tomorrow = "2026-07-09";
  const appointments = [
    { id: "a1", startAt: "2026-07-09T13:00:00.000Z", status: "confirmado" },
    { id: "a2", startAt: "2026-07-09T10:00:00.000Z", status: "pendiente" },
    { id: "a3", startAt: "2026-07-10T13:00:00.000Z", status: "confirmado" },
    { id: "a4", startAt: "2026-07-09T13:00:00.000Z", status: "cancelado" },
    { id: "a5", startAt: "2026-07-09T13:00:00.000Z", status: "completado" },
    { id: "a6", startAt: "2026-07-10T01:00:00.000Z", status: "confirmado" },
  ];

  it("incluye solo turnos de mañana en estado pendiente o confirmado", () => {
    const result = filterAppointmentsForReminder(appointments, tomorrow, new Set());
    expect(result.map((a) => a.id)).toEqual(["a1", "a2", "a6"]);
  });

  it("usa la fecha de Argentina, no la fecha UTC cruda del timestamp", () => {
    const result = filterAppointmentsForReminder(appointments, tomorrow, new Set());
    expect(result.map((a) => a.id)).toContain("a6");
  });

  it("ignora turnos que no son de mañana", () => {
    const result = filterAppointmentsForReminder(appointments, tomorrow, new Set());
    expect(result.find((a) => a.id === "a3")).toBeUndefined();
  });

  it("ignora turnos cancelados o completados", () => {
    const result = filterAppointmentsForReminder(appointments, tomorrow, new Set());
    expect(result.map((a) => a.id)).not.toContain("a4");
    expect(result.map((a) => a.id)).not.toContain("a5");
  });

  it("no repite un recordatorio ya enviado", () => {
    const result = filterAppointmentsForReminder(appointments, tomorrow, new Set(["a1"]));
    expect(result.map((a) => a.id)).toEqual(["a2", "a6"]);
  });
});

describe("filterCuotasForReminder", () => {
  const today = "2026-07-08";
  const cuotas = [
    { id: "c1", table: "installments" as const, dueDate: "2026-07-09", status: "pendiente" },
    { id: "c2", table: "installments" as const, dueDate: "2026-07-11", status: "pendiente" },
    { id: "c3", table: "subscription_charges" as const, dueDate: "2026-07-20", status: "pendiente" },
    { id: "c4", table: "installments" as const, dueDate: "2026-07-05", status: "pendiente" },
    { id: "c5", table: "installments" as const, dueDate: "2026-07-09", status: "pagada" },
  ];

  it("incluye cuotas pendientes que vencen dentro de la ventana de días", () => {
    const result = filterCuotasForReminder(cuotas, today, 3, new Set());
    expect(result.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("ignora cuotas ya vencidas (fuera de ventana hacia atrás)", () => {
    const result = filterCuotasForReminder(cuotas, today, 3, new Set());
    expect(result.map((c) => c.id)).not.toContain("c4");
  });

  it("ignora cuotas que no estén pendientes", () => {
    const result = filterCuotasForReminder(cuotas, today, 3, new Set());
    expect(result.map((c) => c.id)).not.toContain("c5");
  });

  it("no repite un recordatorio ya enviado, distinguiendo por tabla", () => {
    const result = filterCuotasForReminder(cuotas, today, 3, new Set(["installments:c1"]));
    expect(result.map((c) => c.id)).toEqual(["c2"]);
  });
});

describe("buildCuotaReminderMessage", () => {
  it("arma el mensaje con nombre, descripción, monto formateado y fecha dd/MM/yyyy", () => {
    const message = buildCuotaReminderMessage({
      clientFirstName: "Juan",
      description: "Cuota 2/6 - Antena Starlink",
      amount: 45000,
      currency: "ARS",
      dueDate: "2026-07-09",
    });

    expect(message).toContain("Juan");
    expect(message).toContain("Cuota 2/6 - Antena Starlink");
    expect(message).toContain("09/07/2026");
    expect(message).toContain("WINF");
  });
});
