import { describe, expect, it } from "vitest";
import { resolveAppOrigin } from "./app-origin";

const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
const domain = ["kynovia", "com", "br"].join(".");
const productionHost = ["condovia", domain].join(".");
const homologationHost = [["homolog", "condovia"].join("-"), domain].join(".");

describe("resolveAppOrigin", () => {
  it("usa NEXT_PUBLIC_APP_URL quando configurada", () => {
    expect(resolveAppOrigin(`https://${productionHost}/`, headers({ host: "outro.example" }))).toBe(`https://${productionHost}`);
  });

  it("usa o host encaminhado quando a variável está ausente", () => {
    expect(resolveAppOrigin(undefined, headers({ "x-forwarded-host": homologationHost, "x-forwarded-proto": "https" }))).toBe(`https://${homologationHost}`);
  });

  it("ignora valor configurado inválido", () => {
    expect(resolveAppOrigin("nao-e-url", headers({ host: productionHost }))).toBe(`https://${productionHost}`);
  });

  it("usa http para localhost", () => {
    expect(resolveAppOrigin("", headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });

  it("retorna null sem configuração nem host", () => {
    expect(resolveAppOrigin(undefined, headers({}))).toBeNull();
  });
});
