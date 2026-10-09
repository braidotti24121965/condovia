import { describe, expect, it } from "vitest";
import { civilDateToIso, formatCivilDateInput, isoToCivilDate } from "./formats";
import { formatBrazilianCnpj } from "./format";

describe("Brazilian form formats", () => {
  it("preserves letters and check digits when masking a CNPJ", () => {
    expect(formatBrazilianCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(formatBrazilianCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
  it("round trips civil dates without timezone shifts", () => {
    expect(formatCivilDateInput("09012026")).toBe("09/01/2026");
    expect(civilDateToIso("09/01/2026")).toBe("2026-01-09");
    expect(isoToCivilDate("2026-01-09")).toBe("09/01/2026");
  });
  it("rejects impossible and incomplete dates but accepts leap day", () => {
    for (const date of ["31/04/2026", "29/02/2026", "01/13/2026", "09/01/26", "00/01/2026"]) expect(civilDateToIso(date)).toBe("");
    expect(civilDateToIso("29/02/2028")).toBe("2028-02-29");
  });
});
