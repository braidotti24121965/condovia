import { describe, expect, it } from "vitest";
import { initialTenantValues, mapTenantServerError, validateTenantValues } from "@/lib/platform/tenant-form";

describe("new tenant form validation", () => {
  it("identifies required fields and invalid email", () => {
    const errors = validateTenantValues({ ...initialTenantValues, admin_email: "invalid" });
    expect(errors.client_legal_name).toBe("Este campo é obrigatório.");
    expect(errors.admin_email).toBe("Informe um e-mail válido.");
  });
  it("accepts valid CNPJ and CEP and rejects invalid values", () => {
    const base = { ...initialTenantValues, client_legal_name: "Cliente", condominium_name: "Condomínio", admin_name: "Síndica", admin_email: "sindica@example.com" };
    expect(validateTenantValues({ ...base, document_number: "11.222.333/0001-81" }).document_number).toBeUndefined();
    expect(validateTenantValues({ ...base, document_number: "11.222.333/0001-80" }).document_number).toBe("Informe um CNPJ válido.");
    expect(validateTenantValues({ ...base, postal_code: "01310-100", street: "Av. Paulista", city: "São Paulo", state: "SP" }).postal_code).toBeUndefined();
    expect(validateTenantValues({ ...base, postal_code: "01310", street: "Rua", city: "São Paulo", state: "SP" }).postal_code).toBe("Informe um CEP válido.");
  });
  it("maps known backend errors without exposing their contents", () => {
    expect(mapTenantServerError("document_number violates cnpj check").fieldErrors.document_number).toBe("Informe um CNPJ válido.");
    expect(mapTenantServerError("sensitive sql detail").message).not.toContain("sql");
  });
});
