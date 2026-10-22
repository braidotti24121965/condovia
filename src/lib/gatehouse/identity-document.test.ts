import { describe, expect, it } from "vitest";
import {
  isValidCpf,
  isValidPlate,
  normalizePlate,
  validateIdentityDocument,
} from "./identity-document";

describe("isValidCpf", () => {
  it("accepts a CPF with valid check digits, with or without punctuation", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejects wrong check digits, wrong length and repeated digits", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
  });
});

describe("validateIdentityDocument", () => {
  it("returns an error for an invalid CPF", () => {
    expect(validateIdentityDocument("cpf", "529.982.247-26")).toMatch(/CPF inválido/);
  });

  it("accepts RG, CNH and passport with at least 4 characters", () => {
    expect(validateIdentityDocument("rg", "12.345.678-9")).toBeNull();
    expect(validateIdentityDocument("cnh", "01234567890")).toBeNull();
    expect(validateIdentityDocument("passport", "FG123456")).toBeNull();
  });

  it("rejects RG, CNH and passport that are too short", () => {
    expect(validateIdentityDocument("rg", "12")).toMatch(/incompleto/);
    expect(validateIdentityDocument("passport", "  ")).toMatch(/incompleto/);
  });
});

describe("plates", () => {
  it("normalizes case and punctuation", () => {
    expect(normalizePlate("abc-1d23")).toBe("ABC1D23");
  });

  it("accepts Mercosul and legacy plates", () => {
    expect(isValidPlate("ABC1D23")).toBe(true);
    expect(isValidPlate("abc-1234")).toBe(true);
  });

  it("rejects malformed plates", () => {
    expect(isValidPlate("AB12345")).toBe(false);
    expect(isValidPlate("ABCD123")).toBe(false);
  });
});
