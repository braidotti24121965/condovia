import { describe, expect, it } from "vitest";
import { escapeCsvCell, normalizeRows, readTabularFile } from "./parser";

describe("import parser", () => {
  it("reads CSV and applies the active-link start date", () => {
    const rows = readTabularFile(new TextEncoder().encode("unit_id,person_id,occupancy_type\nunit,person,tenant"));
    const result = normalizeRows(rows, "residents", "2026-10-06");
    expect(result.rows[0].classification).toBe("new");
    expect(result.rows[0].data.starts_at).toBe("2026-10-06");
  });

  it("blocks missing required columns and invalid structure types", () => {
    expect(normalizeRows([["name"], ["Torre A"]], "structures", "2026-10-06").structuralError).toContain("structure_type");
    expect(normalizeRows([["name", "structure_type"], ["Torre A", "invalid"]], "structures", "2026-10-06").rows[0].classification).toBe("invalid");
  });

  it("keeps the approved import row limit", () => {
    const rows = [["full_name"], ...Array.from({ length: 2001 }, (_, index) => ["Pessoa " + index])];
    expect(normalizeRows(rows, "people", "2026-10-06").structuralError).toContain("2.000");
  });

  it("rejects malformed, binary and invalid UTF-8 CSV content", () => {
    expect(() => readTabularFile(new TextEncoder().encode('name,code\n"broken,tower'))).toThrow("aspas não fechadas");
    expect(() => readTabularFile(new Uint8Array([0, 1, 2]))).toThrow("binário");
    expect(() => readTabularFile(new Uint8Array([0xc3, 0x28]))).toThrow("UTF-8");
  });

  it("neutralizes formula-like cells in CSV export", () => {
    for (const value of ["=SUM(1,1)", "+1", "-1", "@cmd"]) {
      expect(escapeCsvCell(value)).toBe('"\'' + value + '"');
    }
    expect(escapeCsvCell("normal")).toBe('"normal"');
  });
});
