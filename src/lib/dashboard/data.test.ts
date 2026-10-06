import { describe, expect, it } from "vitest";
import { applyDashboardCount, shouldQueryDashboardModule } from "./data";

describe("dashboard query hardening", () => {
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
});
