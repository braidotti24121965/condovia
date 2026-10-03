import { describe, expect, it } from "vitest";
import { buildAuthorizedContexts, resolveCurrentContext, type AuthorizedContext } from "@/lib/auth/context-data";

describe("buildAuthorizedContexts", () => {
  it("returns only contexts whose roles grant context.read", () => {
    const contexts = buildAuthorizedContexts(
      [{ condominium_id: "condo-a", condominium_name: "Condomínio A", role_name: "Síndico" }],
      [
        { administrator_id: "admin-allowed", administrator_name: "Administradora XYZ", role_name: "Gestor" },
      ],
    );

    expect(contexts).toEqual([
      { type: "condominium", id: "condo-a", name: "Condomínio A", role: "Síndico" },
      { type: "administrator", id: "admin-allowed", name: "Administradora XYZ", role: "Gestor" },
    ]);
  });

  it("returns only contexts supplied by the database authorization helpers", () => {
    const contexts = buildAuthorizedContexts([], []);
    expect(contexts).toEqual([]);
  });

  it("selects the only allowed context without trusting an arbitrary stored id", () => {
    const onlyContext: AuthorizedContext = { type: "condominium", id: "allowed", name: "Condomínio", role: "Morador" };
    expect(resolveCurrentContext([onlyContext], "other-id")).toEqual({ type: "selected", context: onlyContext });
  });

  it("requires an explicit choice when multiple authorized contexts exist", () => {
    const contexts: AuthorizedContext[] = [
      { type: "condominium", id: "condo-a", name: "Condomínio A", role: "Síndico" },
      { type: "administrator", id: "admin-a", name: "Administradora A", role: "Gestor" },
    ];
    expect(resolveCurrentContext(contexts).type).toBe("choose");
    expect(resolveCurrentContext(contexts, "condo-a")).toEqual({ type: "selected", context: contexts[0] });
    expect(resolveCurrentContext(contexts, "outside-scope").type).toBe("choose");
  });

  it("returns the no-context state for an account without authorized memberships", () => {
    expect(resolveCurrentContext([])).toEqual({ type: "none" });
  });
});
