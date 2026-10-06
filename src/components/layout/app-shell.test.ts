import { describe, expect, it } from "vitest";
import { resolvePanelHref } from "./app-shell";
import type { AuthorizedContext } from "@/lib/auth/context";

const condominium = (role: string): AuthorizedContext => ({ type: "condominium", id: "condo-1", name: "Condomínio", role });

describe("Painel landing route", () => {
  it("sends a resident without dashboard permission to Minhas Unidades", () => expect(resolvePanelHref(condominium("Morador"), false)).toBe("/app/my-units"));
  it("keeps the administrative dashboard for a permitted condominium user", () => expect(resolvePanelHref(condominium("Síndico"), true)).toBe("/app/dashboard"));
  it("keeps platform and administrator routes unchanged", () => {
    expect(resolvePanelHref({ type: "platform", id: "platform", name: "CondoVia", role: "Admin" })).toBe("/app/platform");
    expect(resolvePanelHref({ type: "administrator", id: "admin-1", name: "Admin", role: "Admin" })).toBe("/app/dashboard");
  });
});
