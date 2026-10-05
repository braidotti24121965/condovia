import { describe, expect, it } from "vitest";
import { formatBrazilianCnpj, formatBrazilianCpf, formatBrazilianPhone, formatBrazilianPostalCode, friendlyDatabaseError, normalizePostalCode, occupancyTypeLabels, unitTypeLabels, validateBrazilianCnpj } from "@/lib/condominium/format";
import { shouldShowFloor } from "@/lib/condominium/unit-presentation";

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
  it("formats CPF and phone input while typing or pasting", () => {
    expect(formatBrazilianCpf("52998224725")).toBe("529.982.247-25");
    expect(formatBrazilianCpf("529.982.247-25")).toBe("529.982.247-25");
    expect(formatBrazilianPhone("11912345678")).toBe("(11) 91234-5678");
    expect(formatBrazilianPhone("1134567890")).toBe("(11) 3456-7890");
  });
  it("uses domain labels and horizontal/vertical floor presentation", () => {
    expect(unitTypeLabels.house).toBe("Casa");
    expect(occupancyTypeLabels.owner).toBe("Proprietário");
    expect(shouldShowFloor("horizontal")).toBe(false);
    expect(shouldShowFloor("vertical")).toBe(true);
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
