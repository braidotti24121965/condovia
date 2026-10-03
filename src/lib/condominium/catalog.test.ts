import { describe, expect, it } from "vitest";
import { buildStructureTree, filterUnitCatalog, sanitizeCatalogSearch } from "@/lib/condominium/catalog";

describe("condominium catalogs", () => {
  it("builds and sorts nested structures without limiting depth", () => {
    const tree = buildStructureTree([
      { id: "c", parent_id: "b", name: "Setor", code: null, structure_type: "sector", sort_order: 0, status: "active" },
      { id: "b", parent_id: "a", name: "Torre B", code: null, structure_type: "tower", sort_order: 2, status: "active" },
      { id: "a", parent_id: null, name: "Bloco A", code: null, structure_type: "block", sort_order: 0, status: "active" },
    ]);
    expect(tree[0].children[0].children[0].name).toBe("Setor");
  });
  it("removes PostgREST expression separators and wildcard characters", () => {
    expect(sanitizeCatalogSearch("101),code.ilike.%")).toBe("101  code.ilike.");
  });
  it("searches by code or display name case-insensitively", () => {
    const rows = [{ structure_id: "tower-a", code: "101", display_name: "Apartamento Sul", unit_type: "apartment", operational_status: "active" }];
    expect(filterUnitCatalog(rows, { query: "SUL" })).toHaveLength(1);
    expect(filterUnitCatalog(rows, { query: "202" })).toHaveLength(0);
  });
  it("applies structure, type, and status filters together", () => {
    const rows = [
      { structure_id: "a", code: "101", display_name: null, unit_type: "apartment", operational_status: "active" },
      { structure_id: "a", code: "102", display_name: null, unit_type: "house", operational_status: "inactive" },
    ];
    expect(filterUnitCatalog(rows, { structure: "a", type: "apartment", status: "active" })).toHaveLength(1);
    expect(filterUnitCatalog(rows, { structure: "b" })).toHaveLength(0);
  });
});
