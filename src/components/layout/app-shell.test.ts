import { describe, expect, it, vi } from "vitest";
import { closeDrawerOnEscape, resolveNavigation } from "./app-shell";
import type { AuthorizedContext } from "@/lib/auth/context";

const condominium = (role: string): AuthorizedContext => ({ type: "condominium", id: "condo-1", name: "Condomínio", role });

describe("Painel landing route", () => {
  it("shows residents only the operational menu", () => expect(resolveNavigation(condominium("Morador"), false, true)).toEqual({ resident: true, primary: [{ label: "Meu perfil", href: "/app/profile" }, { label: "Minhas Unidades", href: "/app/my-units" }, { label: "Reservas", href: "/app/reservations" }], showCondominiumSection: false }));
  it("keeps the administrative dashboard and condominium section", () => expect(resolveNavigation(condominium("Síndico"), true, true)).toMatchObject({ resident: false, primary: [{ label: "Painel", href: "/app/dashboard" }, { label: "Meu perfil", href: "/app/profile" }], showCondominiumSection: true }));
  it("keeps platform acting context in the administrative navigation", () => expect(resolveNavigation({ ...condominium("Administrador da Plataforma"), actingAsPlatform: true }, true, true, true, true)).toMatchObject({ resident: false, showCondominiumSection: true }));
  it("keeps platform and administrator routes unchanged", () => {
    expect(resolveNavigation({ type: "platform", id: "platform", name: "CondoVia", role: "Admin" }).primary[0].href).toBe("/app/platform");
    expect(resolveNavigation({ type: "administrator", id: "admin-1", name: "Admin", role: "Admin" }).primary[0].href).toBe("/app/dashboard");
  });
});

describe("mobile drawer", () => {
  it("closes the open drawer when Escape is pressed", () => {
    const drawerToggle = { checked: false } as HTMLInputElement;
    const focus = vi.fn();
    const mainContent = { focus } as unknown as HTMLElement;

    expect(drawerToggle.checked).toBe(false);

    drawerToggle.checked = true;
    expect(drawerToggle.checked).toBe(true);

    expect(closeDrawerOnEscape({ key: "Enter" } as KeyboardEvent, drawerToggle, mainContent)).toBe(false);
    expect(drawerToggle.checked).toBe(true);

    expect(closeDrawerOnEscape({ key: "Escape" } as KeyboardEvent, drawerToggle, mainContent)).toBe(true);
    expect(drawerToggle.checked).toBe(false);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
