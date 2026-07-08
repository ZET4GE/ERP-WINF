import { describe, expect, it } from "vitest";

import { findOverlaps } from "./overlap";

const base = { status: "pendiente" };

describe("findOverlaps", () => {
  it("detecta un turno que se superpone parcialmente", () => {
    const existing = [
      { id: "1", start_at: "2026-07-10T10:00:00", end_at: "2026-07-10T11:00:00", ...base },
    ];
    const result = findOverlaps(
      { start_at: "2026-07-10T10:30:00", end_at: "2026-07-10T12:00:00" },
      existing
    );
    expect(result).toHaveLength(1);
  });

  it("no marca superposición cuando los turnos son consecutivos", () => {
    const existing = [
      { id: "1", start_at: "2026-07-10T10:00:00", end_at: "2026-07-10T11:00:00", ...base },
    ];
    const result = findOverlaps(
      { start_at: "2026-07-10T11:00:00", end_at: "2026-07-10T12:00:00" },
      existing
    );
    expect(result).toHaveLength(0);
  });

  it("ignora turnos cancelados", () => {
    const existing = [
      {
        id: "1",
        start_at: "2026-07-10T10:00:00",
        end_at: "2026-07-10T11:00:00",
        status: "cancelado",
      },
    ];
    const result = findOverlaps(
      { start_at: "2026-07-10T10:15:00", end_at: "2026-07-10T10:45:00" },
      existing
    );
    expect(result).toHaveLength(0);
  });

  it("se excluye a sí mismo al editar un turno existente", () => {
    const existing = [
      { id: "1", start_at: "2026-07-10T10:00:00", end_at: "2026-07-10T11:00:00", ...base },
    ];
    const result = findOverlaps(
      { id: "1", start_at: "2026-07-10T10:00:00", end_at: "2026-07-10T11:30:00" },
      existing
    );
    expect(result).toHaveLength(0);
  });
});
