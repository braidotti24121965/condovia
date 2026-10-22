import { describe, expect, it, vi } from "vitest";
import { isFinanceEnabled } from "./flag";

describe("finance feature flag", () => {
  it("keeps Finance frozen even when FINANCE_ENABLED is true", () => {
    vi.stubEnv("FINANCE_ENABLED", "true");
    expect(isFinanceEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("keeps Finance off when FINANCE_ENABLED is unset", () => {
    vi.stubEnv("FINANCE_ENABLED", "");
    expect(isFinanceEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
