import { describe, expect, it } from "vitest";
import { safePersonRelationshipReturnPath } from "@/lib/condominium/person-return";

describe("safePersonRelationshipReturnPath", () => {
  it("preserves scoped owner filters while returning to ownership registration", () => {
    expect(safePersonRelationshipReturnPath("/app/condominium/owners?mode=future&q=Ana&unit=abc", "ownership"))
      .toBe("/app/condominium/owners?mode=future&q=Ana&unit=abc");
  });

  it("accepts the current unit detail for each P3 relationship type", () => {
    const unit = "/app/condominium/units/123e4567-e89b-12d3-a456-426614174000";
    expect(safePersonRelationshipReturnPath(unit, "ownership")).toBe(unit);
    expect(safePersonRelationshipReturnPath(unit, "occupancy")).toBe(unit);
    expect(safePersonRelationshipReturnPath(unit, "financial")).toBe(unit);
  });

  it("rejects external and unrelated return routes", () => {
    expect(safePersonRelationshipReturnPath("https://example.com", "ownership")).toBeNull();
    expect(safePersonRelationshipReturnPath("/app/condominium/people", "ownership")).toBeNull();
    expect(safePersonRelationshipReturnPath("/app/condominium/residents", "ownership")).toBeNull();
    expect(safePersonRelationshipReturnPath("/app/condominium/owners", "occupancy")).toBeNull();
  });

  it("does not preserve unapproved query parameters", () => {
    expect(safePersonRelationshipReturnPath("/app/condominium/residents?type=tenant&next=https://example.com", "occupancy"))
      .toBe("/app/condominium/residents?type=tenant");
  });
});
