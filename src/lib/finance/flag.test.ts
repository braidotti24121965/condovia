import { describe, expect, it, vi } from "vitest";
import { isFinanceEnabled } from "./flag";

describe("finance feature flag", () => {
  it("only enables Finance when FINANCE_ENABLED is exactly true", () => {
    vi.stubEnv("FINANCE_ENABLED", "true");
    expect(isFinanceEnabled()).toBe(true);
    vi.stubEnv("FINANCE_ENABLED", "1");
    expect(isFinanceEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
