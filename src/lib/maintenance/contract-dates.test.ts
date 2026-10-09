import { describe, expect, it } from "vitest";
import { contractDateError } from "./contract-dates";

describe("período do contrato", () => {
  it("rejeita término anterior ao início", () => {
    expect(contractDateError("2026-10-10", "2026-10-09")).toBe("A data de término deve ser igual ou posterior à data de início.");
  });
  it("aceita término no mesmo dia ou depois", () => {
    expect(contractDateError("2026-10-10", "2026-10-10")).toBeNull();
    expect(contractDateError("2026-12-31", "2027-01-01")).toBeNull();
  });
  it("rejeita datas ausentes, impossíveis ou fora do formato civil ISO", () => {
    for (const start of ["", "2026-02-30", "10/10/2026"]) {
      expect(contractDateError(start, "2026-10-10")).toBe("Informe datas de início e término válidas.");
    }
  });
});
