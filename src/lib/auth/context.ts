import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizedContexts, type AuthorizedContext } from "@/lib/auth/context-data";
export type { AuthorizedContext } from "@/lib/auth/context-data";

export async function getAuthorizedContexts(): Promise<AuthorizedContext[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: account } = await supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle();
  if (!account) return [];

  const now = new Date().toISOString();
  const [{ data: condominiumRows }, { data: adminRows }, { data: adminAssignments }] = await Promise.all([
    supabase.rpc("get_authorized_condominiums"),
    supabase.from("administrator_memberships").select("administrator_id, administrators(legal_name)").eq("user_account_id", account.id).eq("status", "active").lte("starts_at", now).or(`ends_at.is.null,ends_at.gt.${now}`),
    supabase.from("role_assignments").select("administrator_id, roles(name, scope, role_permissions(permissions(code)))").eq("user_account_id", account.id).eq("status", "active").lte("starts_at", now).or(`ends_at.is.null,ends_at.gt.${now}`),
  ]);
  const normalizedAdminRows = (adminRows ?? []).map((row) => ({
    administrator_id: row.administrator_id,
    administrators: row.administrators as unknown as { legal_name: string } | null,
  }));
  const normalizedAssignments = (adminAssignments ?? []).map((row) => ({
    administrator_id: row.administrator_id,
    roles: row.roles as unknown as { name: string; scope: string; role_permissions: { permissions: { code: string } | null }[] } | null,
  }));
  return buildAuthorizedContexts(condominiumRows ?? [], normalizedAdminRows, normalizedAssignments);
}

export async function requireCurrentContext() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("condovia_context")?.value;
  const contexts = await getAuthorizedContexts();
  if (contexts.length === 0) redirect("/no-permission");
  if (selectedId) {
    const selected = contexts.find((item) => item.id === selectedId);
    if (selected) return selected;
  }
  if (contexts.length > 1) redirect("/select-context");
  return contexts[0];
}

export async function requireUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireContext(contextId?: string) {
  const contexts = await getAuthorizedContexts();
  if (contexts.length === 0) redirect("/no-permission");
  if (!contextId) {
    if (contexts.length > 1) redirect("/select-context");
    return contexts[0];
  }
  const context = contexts.find((item) => item.id === contextId);
  if (!context) redirect("/select-context?error=invalid-context");
  return context;
}
