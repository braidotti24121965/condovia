import { describe, expect, it } from "vitest";
import { buildWeeklySummary } from "./weekly-summary";

const now = new Date("2026-10-23T12:00:00Z");
const base = { now, todayIso: "2026-10-23" };

describe("buildWeeklySummary", () => {
  it("conta ocorrências abertas, urgentes e as movimentadas na semana", () => {
    const summary = buildWeeklySummary({
      ...base,
      occurrences: [
        { status: "open", priority: "urgent", created_at: "2026-10-22T10:00:00Z", resolved_at: null },
        { status: "in_progress", priority: "normal", created_at: "2026-10-01T10:00:00Z", resolved_at: null },
        { status: "closed", priority: "low", created_at: "2026-10-01T10:00:00Z", resolved_at: "2026-10-21T10:00:00Z" },
        { status: "cancelled", priority: "normal", created_at: "2026-10-20T10:00:00Z", resolved_at: null },
      ],
      workOrders: [],
      requests: [],
      contracts: [],
    });
    // A cancelada foi aberta dentro da semana, então conta como aberta na semana.
    expect(summary.occurrences).toEqual({ openNow: 2, openUrgent: 1, openedLast7Days: 2, resolvedLast7Days: 1 });
  });

  it("conta OS abertas e vencidas, sem contar as concluídas ou canceladas", () => {
    const summary = buildWeeklySummary({
      ...base,
      occurrences: [],
      workOrders: [
        { status: "assigned", due_at: "2026-10-20" },
        { status: "in_progress", due_at: "2026-10-30" },
        { status: "completed", due_at: "2026-10-01" },
        { status: "cancelled", due_at: "2026-10-01" },
        { status: "open", due_at: null },
      ],
      requests: [],
      contracts: [],
    });
    expect(summary.workOrders).toEqual({ openNow: 3, overdue: 1 });
  });

  it("conta solicitações aguardando análise e as abertas na semana", () => {
    const summary = buildWeeklySummary({
      ...base,
      occurrences: [],
      workOrders: [],
      requests: [
        { status: "pending_review", opened_at: "2026-10-22T10:00:00Z" },
        { status: "pending_review", opened_at: "2026-10-01T10:00:00Z" },
        { status: "approved", opened_at: "2026-10-22T10:00:00Z" },
      ],
      contracts: [],
    });
    expect(summary.requests).toEqual({ pendingReview: 2, openedLast7Days: 2 });
  });

  it("conta contratos ativos que terminam nos próximos 30 dias", () => {
    const summary = buildWeeklySummary({
      ...base,
      occurrences: [],
      workOrders: [],
      requests: [],
      contracts: [
        { status: "active", ends_on: "2026-11-10" },
        { status: "active", ends_on: "2026-12-30" },
        { status: "active", ends_on: "2026-10-01" },
        { status: "ended", ends_on: "2026-11-10" },
      ],
    });
    expect(summary.contracts.endingIn30Days).toBe(1);
  });

  it("não conta nada quando não há dados", () => {
    const summary = buildWeeklySummary({ ...base, occurrences: [], workOrders: [], requests: [], contracts: [] });
    expect(summary.occurrences.openNow).toBe(0);
    expect(summary.workOrders.overdue).toBe(0);
    expect(summary.requests.pendingReview).toBe(0);
    expect(summary.contracts.endingIn30Days).toBe(0);
  });
});
