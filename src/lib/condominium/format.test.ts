import { describe, expect, it } from "vitest";
import { friendlyDatabaseError, normalizePostalCode, validateBrazilianCnpj } from "@/lib/condominium/format";

describe("condominium formatting and validation", () => {
  it("normalizes a Brazilian postal code without inventing missing digits", () => {
    expect(normalizePostalCode("01310-100")).toBe("01310100");
    expect(normalizePostalCode("123")).toBe("123");
  });
  it("validates CNPJ check digits", () => {
    expect(validateBrazilianCnpj("11.222.333/0001-81")).toBe(true);
    expect(validateBrazilianCnpj("11.222.333/0001-80")).toBe(false);
    expect(validateBrazilianCnpj("00.000.000/0000-00")).toBe(false);
  });
  it("maps database conflicts to actionable friendly copy", () => {
    expect(friendlyDatabaseError("duplicate key value violates unique constraint")).toContain("Já existe");
    expect(friendlyDatabaseError("Reparenting would create a hierarchy cycle")).toContain("hierarquia inválida");
  });
});
