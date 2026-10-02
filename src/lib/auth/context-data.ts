export type AuthorizedContext = {
  type: "condominium" | "administrator";
  id: string;
  name: string;
  role: string;
};

type CondominiumRow = { condominium_id: string; condominium_name: string; role_name: string };
type AdministratorRow = { administrator_id: string; administrators: { legal_name: string } | null };
type AssignmentRow = {
  administrator_id: string | null;
  roles: {
    name: string;
    scope: string;
    role_permissions: { permissions: { code: string } | null }[];
  } | null;
};

export function buildAuthorizedContexts(condominiumRows: CondominiumRow[], adminRows: AdministratorRow[], assignments: AssignmentRow[]): AuthorizedContext[] {
  const contexts = new Map<string, AuthorizedContext>();
  for (const row of condominiumRows) {
    contexts.set(`condominium:${row.condominium_id}`, {
      type: "condominium", id: row.condominium_id, name: row.condominium_name, role: row.role_name,
    });
  }
  for (const row of adminRows) {
    const role = assignments
      .filter((item) => item.administrator_id === row.administrator_id)
      .map((item) => item.roles)
      .find((candidate) => candidate?.scope === "administrator" && candidate.role_permissions.some((item) => item.permissions?.code === "context.read"));
    if (row.administrators && role) {
      contexts.set(`administrator:${row.administrator_id}`, {
        type: "administrator", id: row.administrator_id, name: row.administrators.legal_name, role: role.name,
      });
    }
  }
  return [...contexts.values()];
}
