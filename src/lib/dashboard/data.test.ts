import { describe, expect, it } from "vitest";
import { aggregateDashboardDates, aggregateDashboardValues, applyDashboardCount, countActiveUrgentOccurrences, dashboardOccurrencesSelect, dashboardPeriodDays, shouldQueryDashboardModule } from "./data";

describe("dashboard query hardening", () => {
  it("disambiguates the condominium-scoped occurrence category relationship", () => {
    expect(dashboardOccurrencesSelect).toContain("occurrence_categories!occurrences_category_id_condominium_id_fkey(name)");
  });
  it("propagates real query errors without converting them to zero", () => {
    const result = { error: null as string | null, units: null as number | null };
    const applied = applyDashboardCount(result, { error: new Error("database unavailable") }, (value) => { result.units = value; }, null);
    expect(applied).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.units).toBeNull();
  });

  it("does not execute a module query without its permission", () => {
    expect(shouldQueryDashboardModule(false)).toBe(false);
    expect(shouldQueryDashboardModule(true)).toBe(true);
  });

  it("does not reveal a protected metric without permission", () => {
    const result = { error: null as string | null, units: null as number | null };
    if (shouldQueryDashboardModule(false)) {
      applyDashboardCount(result, { error: null }, (value) => {
        result.units = value;
      }, 42);
    }
    expect(result.units).toBeNull();
  });

  it("groups reservations by the selected local day", () => {
    expect(aggregateDashboardDates(["2026-10-06T03:00:00.000Z", "2026-10-06T15:00:00.000Z"], "America/Sao_Paulo")).toEqual([{ label: "2026-10-06", value: 2 }]);
    expect(dashboardPeriodDays("today")).toBe(1);
    expect(dashboardPeriodDays("7d")).toBe(7);
    expect(dashboardPeriodDays("30d")).toBe(30);
  });

  it("groups occurrence categories and unit operational statuses without renaming them", () => {
    expect(aggregateDashboardValues(["Infraestrutura", "Limpeza", "Infraestrutura"])).toEqual([{ label: "Infraestrutura", value: 2 }, { label: "Limpeza", value: 1 }]);
    expect(aggregateDashboardValues(["active", "under_construction", "active"])).toEqual([{ label: "active", value: 2 }, { label: "under_construction", value: 1 }]);
  });

  it("counts only active urgent occurrences", () => {
    expect(countActiveUrgentOccurrences([{ priority: "urgent", status: "open" }, { priority: "urgent", status: "closed" }, { priority: "high", status: "open" }, { priority: "urgent", status: "cancelled" }])).toBe(1);
  });

  it("represents empty aggregations as empty and keeps import rows read-only", () => {
    expect(aggregateDashboardValues([])).toEqual([]);
    expect(aggregateDashboardDates([], "America/Sao_Paulo")).toEqual([]);
  });
});
