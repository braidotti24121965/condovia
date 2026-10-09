import { describe, expect, it } from "vitest";
import { getAssigneeDisplayName, getResponsibleDisplayName } from "./work-order-presenters";

describe("work order responsible presenter", () => {
  it("reads a singular nested people relationship", () => {
    expect(getResponsibleDisplayName({ people: { full_name: "Usuário de Teste CondoVia" } })).toBe("Usuário de Teste CondoVia");
  });

  it("reads array-shaped responsible and people relationships", () => {
    expect(getResponsibleDisplayName([{ people: [{ full_name: "Usuário de Teste CondoVia" }] }])).toBe("Usuário de Teste CondoVia");
  });

  it("returns null only when the relationship has no name", () => {
    expect(getResponsibleDisplayName(null)).toBeNull();
    expect(getResponsibleDisplayName({ people: [] })).toBeNull();
  });

  it("resolves a responsible name from the tenant-scoped assignee list", () => {
    expect(getAssigneeDisplayName([{ user_account_id: "u1", display_name: "Usuário de Teste CondoVia" }], "u1")).toBe("Usuário de Teste CondoVia");
  });
});
