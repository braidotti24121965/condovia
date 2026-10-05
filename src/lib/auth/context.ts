import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizedContexts, resolveCurrentContext, type AuthorizedContext } from "@/lib/auth/context-data";
export type { AuthorizedContext } from "@/lib/auth/context-data";

export async function getAuthorizedContexts(): Promise<AuthorizedContext[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: account } = await supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle();
  if (!account) return [];

  const [{ data: condominiumRows }, { data: adminRows }, { data: platformAdmin }] = await Promise.all([
    supabase.rpc("get_authorized_condominiums"),
    supabase.rpc("get_authorized_administrators"),
    supabase.rpc("has_platform_permission", { permission_code: "platform.manage" }),
  ]);
  return buildAuthorizedContexts(condominiumRows ?? [], adminRows ?? [], platformAdmin === true);
}

export async function requireCurrentContext() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("condovia_context")?.value;
  const contexts = await getAuthorizedContexts();
  const resolution = resolveCurrentContext(contexts, selectedId);
  if (resolution.type === "none") redirect("/no-permission");
  if (resolution.type === "choose") redirect("/select-context");
  return resolution.context;
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
