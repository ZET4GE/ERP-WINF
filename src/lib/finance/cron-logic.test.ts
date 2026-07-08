import { describe, expect, it } from "vitest";

import {
  computeClientsToMarkAsOverdue,
  computeOverdueToMark,
  computeRecurringExpenseTransactionsToCreate,
  computeSubscriptionChargesToCreate,
} from "./cron-logic";

describe("computeSubscriptionChargesToCreate", () => {
  const period = "2026-07-01";
  const activeItems = [
    { id: "item-1", monthlyAmount: 45000, currency: "ARS" as const },
    { id: "item-2", monthlyAmount: 20, currency: "USD" as const },
  ];

  it("propone un charge por cada contract_item activo sin charge para el período", () => {
    const result = computeSubscriptionChargesToCreate(period, activeItems, []);

    expect(result).toEqual([
      { contractItemId: "item-1", period, amount: 45000, currency: "ARS" },
      { contractItemId: "item-2", period, amount: 20, currency: "USD" },
    ]);
  });

  it("ignora contract_items que ya tienen charge para ese período", () => {
    const result = computeSubscriptionChargesToCreate(period, activeItems, [
      { contractItemId: "item-1", period },
    ]);

    expect(result).toEqual([
      { contractItemId: "item-2", period, amount: 20, currency: "USD" },
    ]);
  });

  it("no confunde charges de otros períodos con el actual", () => {
    const result = computeSubscriptionChargesToCreate(period, activeItems, [
      { contractItemId: "item-1", period: "2026-06-01" },
    ]);

    expect(result).toHaveLength(2);
  });

  it("es idempotente: correrlo dos veces el mismo mes no duplica nada", () => {
    const firstRun = computeSubscriptionChargesToCreate(period, activeItems, []);

    // Simula que la primera corrida ya insertó esos charges.
    const existingAfterFirstRun = firstRun.map((charge) => ({
      contractItemId: charge.contractItemId,
      period: charge.period,
    }));

    const secondRun = computeSubscriptionChargesToCreate(
      period,
      activeItems,
      existingAfterFirstRun
    );

    expect(secondRun).toEqual([]);
  });
});

describe("computeRecurringExpenseTransactionsToCreate", () => {
  const expenses = [
    { id: "exp-1", amount: 15000, currency: "ARS" as const, categoryId: "cat-1", contractId: null },
    { id: "exp-2", amount: 30, currency: "USD" as const, categoryId: null, contractId: "contract-1" },
  ];

  it("propone un egreso por cada recurring_expense activo sin transaction este mes", () => {
    const result = computeRecurringExpenseTransactionsToCreate(expenses, []);

    expect(result).toEqual([
      { recurringExpenseId: "exp-1", amount: 15000, currency: "ARS", categoryId: "cat-1" },
      { recurringExpenseId: "exp-2", amount: 30, currency: "USD", categoryId: null },
    ]);
  });

  it("ignora recurring_expenses que ya tienen transaction este mes", () => {
    const result = computeRecurringExpenseTransactionsToCreate(expenses, [
      { recurringExpenseId: "exp-1" },
    ]);

    expect(result).toEqual([
      { recurringExpenseId: "exp-2", amount: 30, currency: "USD", categoryId: null },
    ]);
  });

  it("es idempotente: correrlo dos veces el mismo mes no duplica nada", () => {
    const firstRun = computeRecurringExpenseTransactionsToCreate(expenses, []);

    const existingAfterFirstRun = firstRun.map((tx) => ({
      recurringExpenseId: tx.recurringExpenseId,
    }));

    const secondRun = computeRecurringExpenseTransactionsToCreate(
      expenses,
      existingAfterFirstRun
    );

    expect(secondRun).toEqual([]);
  });
});

describe("computeOverdueToMark", () => {
  const today = "2026-07-08";

  it("marca vencidas las installments pendientes con due_date pasado", () => {
    const result = computeOverdueToMark(
      today,
      [
        { id: "inst-1", dueDate: "2026-07-01" }, // vencida
        { id: "inst-2", dueDate: "2026-07-08" }, // vence hoy, no vencida todavía
        { id: "inst-3", dueDate: "2026-08-01" }, // futura
      ],
      []
    );

    expect(result.installmentIds).toEqual(["inst-1"]);
  });

  it("marca vencidos los subscription_charges con period anterior al mes actual", () => {
    const result = computeOverdueToMark(
      today,
      [],
      [
        { id: "charge-1", period: "2026-06-01" }, // vencido
        { id: "charge-2", period: "2026-07-01" }, // del mes actual, no vencido
        { id: "charge-3", period: "2026-05-01" }, // vencido
      ]
    );

    expect(result.subscriptionChargeIds.sort()).toEqual(["charge-1", "charge-3"]);
  });

  it("ignora lo que ya no está pendiente (no se le pasa como entrada)", () => {
    // Las funciones puras reciben solo lo que sigue 'pendiente'; simulamos
    // que una cuota ya pagada o ya vencida no forma parte del input.
    const result = computeOverdueToMark(today, [{ id: "inst-2", dueDate: "2026-07-08" }], []);

    expect(result.installmentIds).toEqual([]);
  });

  it("es idempotente: correrlo dos veces no vuelve a marcar lo ya vencido", () => {
    const pendingInstallments = [
      { id: "inst-1", dueDate: "2026-07-01" },
      { id: "inst-2", dueDate: "2026-08-01" },
    ];
    const pendingCharges = [
      { id: "charge-1", period: "2026-06-01" },
      { id: "charge-2", period: "2026-07-01" },
    ];

    const firstRun = computeOverdueToMark(today, pendingInstallments, pendingCharges);
    expect(firstRun.installmentIds).toEqual(["inst-1"]);
    expect(firstRun.subscriptionChargeIds).toEqual(["charge-1"]);

    // Segunda corrida: los recién marcados 'vencida' ya no están 'pendiente',
    // así que no vuelven a aparecer en el input.
    const remainingInstallments = pendingInstallments.filter(
      (installment) => !firstRun.installmentIds.includes(installment.id)
    );
    const remainingCharges = pendingCharges.filter(
      (charge) => !firstRun.subscriptionChargeIds.includes(charge.id)
    );

    const secondRun = computeOverdueToMark(today, remainingInstallments, remainingCharges);

    expect(secondRun.installmentIds).toEqual([]);
    expect(secondRun.subscriptionChargeIds).toEqual([]);
  });
});

describe("computeClientsToMarkAsOverdue", () => {
  it("marca como moroso al cliente con 2 o más vencidos", () => {
    const result = computeClientsToMarkAsOverdue({
      "client-1": 2,
      "client-2": 1,
      "client-3": 5,
    });

    expect(result.sort()).toEqual(["client-1", "client-3"]);
  });

  it("no marca a nadie si ningún cliente llega a 2 vencidos", () => {
    const result = computeClientsToMarkAsOverdue({
      "client-1": 0,
      "client-2": 1,
    });

    expect(result).toEqual([]);
  });

  it("es idempotente: volver a correrlo con el mismo conteo devuelve el mismo resultado", () => {
    const overdueCounts = { "client-1": 2, "client-2": 1 };

    const firstRun = computeClientsToMarkAsOverdue(overdueCounts);
    const secondRun = computeClientsToMarkAsOverdue(overdueCounts);

    expect(secondRun).toEqual(firstRun);
    expect(secondRun).toEqual(["client-1"]);
  });
});
