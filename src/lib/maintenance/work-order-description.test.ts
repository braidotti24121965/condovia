import { describe, expect, it } from "vitest";
import { workOrderDescription } from "./work-order-description";

describe("workOrderDescription", () => {
  it("keeps the complement typed in the form", () => {
    expect(workOrderDescription("  Trocar a vedação  ", { title: "Vazamento", description: "Bomba pinga" })).toBe("Trocar a vedação");
  });

  it("uses the request description when the complement is empty", () => {
    expect(workOrderDescription("", { title: "Vazamento", description: "Bomba pinga" })).toBe("Bomba pinga");
  });

  it("falls back to the request title when the request has no description", () => {
    expect(workOrderDescription("   ", { title: "Vazamento na bomba", description: null })).toBe("Vazamento na bomba");
  });

  it("returns empty when there is no complement and no request", () => {
    expect(workOrderDescription("", null)).toBe("");
  });
});
