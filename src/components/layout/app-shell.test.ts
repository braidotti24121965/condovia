import { describe, expect, it } from "vitest";
import { resolveNavigation } from "./app-shell";
import type { AuthorizedContext } from "@/lib/auth/context";

const condominium = (role: string): AuthorizedContext => ({ type: "condominium", id: "condo-1", name: "Condomínio", role });

describe("Painel landing route", () => {
  it("shows residents only the operational menu", () => expect(resolveNavigation(condominium("Morador"), false, true)).toEqual({ resident: true, primary: [{ label: "Meu perfil", href: "/app/profile" }, { label: "Minhas Unidades", href: "/app/my-units" }, { label: "Reservas", href: "/app/reservations" }], showCondominiumSection: false }));
  it("keeps the administrative dashboard and condominium section", () => expect(resolveNavigation(condominium("Síndico"), true, true)).toMatchObject({ resident: false, primary: [{ label: "Painel", href: "/app/dashboard" }, { label: "Meu perfil", href: "/app/profile" }], showCondominiumSection: true }));
  it("keeps platform and administrator routes unchanged", () => {
    expect(resolveNavigation({ type: "platform", id: "platform", name: "CondoVia", role: "Admin" }).primary[0].href).toBe("/app/platform");
    expect(resolveNavigation({ type: "administrator", id: "admin-1", name: "Admin", role: "Admin" }).primary[0].href).toBe("/app/dashboard");
  });
});
