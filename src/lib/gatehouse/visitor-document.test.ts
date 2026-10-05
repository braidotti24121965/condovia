import { describe, expect, it } from "vitest";
import { hasDuplicateVisitorDocument, normalizeVisitorDocumentNumber } from "./visitor-document";

describe("visitor document uniqueness normalization", () => {
  it("normalizes a new CPF and treats masked and unmasked values equally", () => {
    expect(normalizeVisitorDocumentNumber("cpf", "529.982.247-25")).toBe("52998224725");
    expect(normalizeVisitorDocumentNumber("cpf", "52998224725")).toBe("52998224725");
  });

  it("keeps absent documents nullable", () => {
    expect(normalizeVisitorDocumentNumber("cpf", "   ")).toBeNull();
    expect(normalizeVisitorDocumentNumber(null, "")).toBeNull();
  });

  it("scopes duplicates by condominium and document type", () => {
    const existing = [{ condominium_id: "condo-a", document_type: "cpf", document_number: "52998224725" }];
    expect(hasDuplicateVisitorDocument(existing, "condo-a", "cpf", "529.982.247-25")).toBe(true);
    expect(hasDuplicateVisitorDocument(existing, "condo-b", "cpf", "529.982.247-25")).toBe(false);
    expect(hasDuplicateVisitorDocument(existing, "condo-a", "rg", "52998224725")).toBe(false);
    expect(hasDuplicateVisitorDocument(existing, "condo-a", "cpf", "")).toBe(false);
  });
});
