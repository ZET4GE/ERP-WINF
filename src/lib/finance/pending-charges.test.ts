import { describe, expect, it } from "vitest";

import { buildPendingCharges, type PendingChargeSource } from "./pending-charges";

function source(overrides: Partial<PendingChargeSource> = {}): PendingChargeSource {
  return {
    id: "1",
    table: "installments",
    status: "pendiente",
    dueDate: "2026-07-10",
    amount: 1000,
    currency: "ARS",
    description: "Cuota 1/6",
    clientId: "c1",
    clientName: "Juan Pérez",
    phone: "3564123456",
    ...overrides,
  };
}

describe("buildPendingCharges", () => {
  it("calcula 0 días de atraso para una cuota que todavía no vence", () => {
    const result = buildPendingCharges([source({ dueDate: "2026-07-10" })], "2026-07-05");
    expect(result[0].overdueDays).toBe(0);
  });

  it("calcula los días de atraso para una cuota vencida", () => {
    const result = buildPendingCharges([source({ dueDate: "2026-07-01", status: "vencida" })], "2026-07-08");
    expect(result[0].overdueDays).toBe(7);
  });

  it("ordena por vencimiento ascendente, lo más vencido primero", () => {
    const result = buildPendingCharges(
      [
        source({ id: "a", dueDate: "2026-07-15" }),
        source({ id: "b", dueDate: "2026-07-01" }),
        source({ id: "c", dueDate: "2026-07-08" }),
      ],
      "2026-07-08"
    );
    expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
});
