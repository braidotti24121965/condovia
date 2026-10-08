export type AuthorizedContext = {
  type: "condominium" | "administrator" | "platform";
  id: string;
  name: string;
  role: string;
  actingAsPlatform?: boolean;
};

type CondominiumRow = { condominium_id: string; condominium_name: string; role_name: string };
type AdministratorRow = { administrator_id: string; administrator_name: string; role_name: string };

export function buildAuthorizedContexts(condominiumRows: CondominiumRow[], adminRows: AdministratorRow[], platformAdmin = false): AuthorizedContext[] {
  const contexts = new Map<string, AuthorizedContext>();
  for (const row of condominiumRows) {
    contexts.set(`condominium:${row.condominium_id}`, {
      type: "condominium", id: row.condominium_id, name: row.condominium_name, role: row.role_name,
    });
  }
  for (const row of adminRows) {
    contexts.set(`administrator:${row.administrator_id}`, {
      type: "administrator", id: row.administrator_id, name: row.administrator_name, role: row.role_name,
    });
  }
  if (platformAdmin) contexts.set("platform:platform", {
    type: "platform", id: "platform", name: "CondoVia", role: "Administrador da plataforma",
  });
  return [...contexts.values()];
}

export type ContextResolution =
  | { type: "none" }
  | { type: "selected"; context: AuthorizedContext }
  | { type: "choose" };

export function resolveCurrentContext(contexts: AuthorizedContext[], selectedId?: string): ContextResolution {
  if (contexts.length === 0) return { type: "none" };
  const selected = contexts.find((context) => context.id === selectedId);
  if (selected) return { type: "selected", context: selected };
  if (contexts.length === 1) return { type: "selected", context: contexts[0] };
  return { type: "choose" };
}
