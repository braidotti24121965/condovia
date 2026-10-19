import { describe, expect, it } from "vitest";
import { resolveAppOrigin } from "./app-origin";

const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

describe("resolveAppOrigin", () => {
  it("usa NEXT_PUBLIC_APP_URL quando configurada", () => {
    expect(resolveAppOrigin("https://condovia.kynovia.com.br/", headers({ host: "outro.example" }))).toBe("https://condovia.kynovia.com.br");
  });

  it("usa o host encaminhado quando a variável está ausente", () => {
    expect(resolveAppOrigin(undefined, headers({ "x-forwarded-host": "homolog-condovia.kynovia.com.br", "x-forwarded-proto": "https" }))).toBe("https://homolog-condovia.kynovia.com.br");
  });

  it("ignora valor configurado inválido", () => {
    expect(resolveAppOrigin("nao-e-url", headers({ host: "condovia.kynovia.com.br" }))).toBe("https://condovia.kynovia.com.br");
  });

  it("usa http para localhost", () => {
    expect(resolveAppOrigin("", headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });

  it("retorna null sem configuração nem host", () => {
    expect(resolveAppOrigin(undefined, headers({}))).toBeNull();
  });
});
