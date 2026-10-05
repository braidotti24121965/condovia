import { describe, expect, it } from "vitest";
import { formatBrazilianCnpj, formatBrazilianPostalCode, friendlyDatabaseError, normalizePostalCode, validateBrazilianCnpj } from "@/lib/condominium/format";

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
  it("formats CNPJ and CEP while accepting unmasked input", () => {
    expect(formatBrazilianCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatBrazilianPostalCode("01310100")).toBe("01310-100");
  });
  it("maps database conflicts to actionable friendly copy", () => {
    expect(friendlyDatabaseError("duplicate key value violates unique constraint")).toContain("Já existe");
    expect(friendlyDatabaseError("Reparenting would create a hierarchy cycle")).toContain("hierarquia inválida");
    expect(friendlyDatabaseError("Períodos de propriedade da mesma pessoa não podem se sobrepor.")).toBe("Já existe um período registrado para esta pessoa nesta unidade.");
    expect(friendlyDatabaseError("A soma das participações conhecidas neste período excede 100%.")).toBe("A soma das participações ultrapassa 100% no período informado.");
    expect(friendlyDatabaseError("Pessoa ativa não vinculada a este condomínio.")).toBe("A pessoa deve estar vinculada e ativa neste condomínio.");
    expect(friendlyDatabaseError("Já existe morador principal neste período.")).toBe("Já existe um morador principal neste período.");
    expect(friendlyDatabaseError("Já existe responsável financeiro neste período.")).toBe("Já existe um responsável financeiro neste período.");
  });
});
