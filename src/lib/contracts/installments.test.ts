import { describe, expect, it } from "vitest";

import { generateInstallmentPlan } from "./installments";

describe("generateInstallmentPlan", () => {
  it("reparte 300.000 con entrega de 60.000 en 6 cuotas de 40.000 exactas", () => {
    const plan = generateInstallmentPlan({
      totalAmount: 300000,
      downPayment: 60000,
      installmentsCount: 6,
      startDate: new Date("2026-01-01"),
    });

    expect(plan).toHaveLength(6);
    expect(plan.every((entry) => entry.amount === 40000)).toBe(true);
    expect(plan.reduce((sum, entry) => sum + entry.amount, 0)).toBe(240000);
  });

  it("absorbe el redondeo de centavos en la última cuota", () => {
    const plan = generateInstallmentPlan({
      totalAmount: 100000,
      downPayment: 0,
      installmentsCount: 3,
      startDate: new Date("2026-01-01"),
    });

    expect(plan[0].amount).toBe(33333.33);
    expect(plan[1].amount).toBe(33333.33);
    expect(plan[2].amount).toBe(33333.34);
    expect(plan.reduce((sum, entry) => sum + entry.amount, 0)).toBe(100000);
  });

  it("sin entrega inicial financia el monto total", () => {
    const plan = generateInstallmentPlan({
      totalAmount: 60000,
      installmentsCount: 1,
      startDate: new Date("2026-01-01"),
    });

    expect(plan).toEqual([
      { number: 1, amount: 60000, dueDate: "2026-02-01" },
    ]);
  });

  it("genera vencimientos mensuales consecutivos", () => {
    const plan = generateInstallmentPlan({
      totalAmount: 12000,
      installmentsCount: 3,
      startDate: new Date("2026-01-15"),
    });

    expect(plan.map((entry) => entry.dueDate)).toEqual([
      "2026-02-15",
      "2026-03-15",
      "2026-04-15",
    ]);
  });

  it("entrega igual al total no genera cuotas", () => {
    const plan = generateInstallmentPlan({
      totalAmount: 50000,
      downPayment: 50000,
      installmentsCount: 6,
      startDate: new Date("2026-01-01"),
    });

    expect(plan).toEqual([]);
  });
});
