import { describe, expect, it } from "vitest";
import { isValidCpf, validatePersonFields } from "./person-validation";

describe("person validation", () => {
  it("accepts and rejects CPF values correctly", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123.456.789-00")).toBe(false);
  });

  it("reports contact and date errors before submission", () => {
    expect(validatePersonFields({ fullName: "A", birthDate: "2024-02-31", email: "invalid", phone: "999" })).toEqual({
      full_name: "Informe o nome completo.",
      birth_date: "Informe uma data de nascimento válida.",
      email: "Informe um e-mail válido.",
      phone: "Informe um telefone válido com DDD.",
    });
  });
});
