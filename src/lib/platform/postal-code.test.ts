import { describe, expect, it } from "vitest";
import { parseViaCepResponse } from "@/lib/platform/postal-code";

describe("ViaCEP address parsing", () => {
  it("maps a valid CEP response to editable address fields", () => {
    expect(parseViaCepResponse({ logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" })).toEqual({
      street: "Avenida Paulista", district: "Bela Vista", city: "São Paulo", state: "SP",
    });
  });

  it("rejects a CEP marked as nonexistent", () => {
    expect(parseViaCepResponse({ erro: true })).toBeNull();
  });
});
