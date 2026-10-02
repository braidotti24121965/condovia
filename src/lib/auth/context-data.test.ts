import { describe, expect, it } from "vitest";
import { buildAuthorizedContexts } from "@/lib/auth/context-data";

describe("buildAuthorizedContexts", () => {
  it("returns only contexts whose roles grant context.read", () => {
    const contexts = buildAuthorizedContexts(
      [{ condominium_id: "condo-a", condominium_name: "Condomínio A", role_name: "Síndico" }],
      [
        { administrator_id: "admin-allowed", administrators: { legal_name: "Administradora XYZ" } },
        { administrator_id: "admin-denied", administrators: { legal_name: "Administradora sem acesso" } },
      ],
      [
        { administrator_id: "admin-allowed", roles: { name: "Gestor", scope: "administrator", role_permissions: [{ permissions: { code: "context.read" } }] } },
        { administrator_id: "admin-denied", roles: { name: "Colaborador", scope: "administrator", role_permissions: [{ permissions: { code: "administrator.read" } }] } },
      ],
    );

    expect(contexts).toEqual([
      { type: "condominium", id: "condo-a", name: "Condomínio A", role: "Síndico" },
      { type: "administrator", id: "admin-allowed", name: "Administradora XYZ", role: "Gestor" },
    ]);
  });

  it("does not treat a condominium role as an administrator role", () => {
    const contexts = buildAuthorizedContexts([], [
      { administrator_id: "admin-a", administrators: { legal_name: "Administradora A" } },
    ], [
      { administrator_id: "admin-a", roles: { name: "Síndico", scope: "condominium", role_permissions: [{ permissions: { code: "context.read" } }] } },
    ]);
    expect(contexts).toEqual([]);
  });
});
