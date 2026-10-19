import { describe, expect, it } from "vitest";
import { defaultNextFor, parseEmailOtpType, safeNextPath } from "./email-link";

describe("parseEmailOtpType", () => {
  it("aceita recovery", () => expect(parseEmailOtpType("recovery")).toBe("recovery"));
  it("rejeita tipos desconhecidos ou vazios", () => {
    expect(parseEmailOtpType("admin")).toBeNull();
    expect(parseEmailOtpType(null)).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("mantém caminhos internos", () => expect(safeNextPath("/reset-password")).toBe("/reset-password"));
  it("bloqueia URLs externas e protocol-relative", () => {
    expect(safeNextPath("https://evil.example")).toBe("/app");
    expect(safeNextPath("//evil.example")).toBe("/app");
    expect(safeNextPath("/\\evil.example")).toBe("/app");
  });
  it("usa o fallback quando ausente", () => expect(safeNextPath(null, "/reset-password")).toBe("/reset-password"));
});

describe("defaultNextFor", () => {
  it("leva a recuperação para a redefinição de senha", () => expect(defaultNextFor("recovery")).toBe("/reset-password"));
});
