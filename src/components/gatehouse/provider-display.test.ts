import { describe, expect, it } from "vitest";
import { formatProviderLabel } from "./provider-display";

describe("provider display", () => {
  it("separates the professional name from the company", () => {
    expect(formatProviderLabel("Carlos Teste Eletricista", "Elétrica Teste Ltda")).toBe("Carlos Teste Eletricista · Elétrica Teste Ltda");
  });
});
