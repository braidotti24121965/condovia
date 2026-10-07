import { describe, expect, it } from "vitest";
import { occurrencesListSelect } from "./query";

describe("occurrences list query", () => {
  it("uses the condominium-scoped foreign keys for embedded category and unit", () => {
    expect(occurrencesListSelect).toContain("occurrence_categories!occurrences_category_id_condominium_id_fkey(name)");
    expect(occurrencesListSelect).toContain("units!occurrences_related_unit_id_condominium_id_fkey(code,display_name)");
  });
});
