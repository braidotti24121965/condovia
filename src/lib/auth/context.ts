import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  const contexts = buildAuthorizedContexts(condominiumRows ?? [], adminRows ?? [], platformAdmin === true);
  if (platformAdmin === true) {
    const cookieStore = await cookies();
    const actingId = cookieStore.get("condovia_context")?.value;
    const actingMarker = cookieStore.get("condovia_acting_context")?.value;
    if (actingMarker === "platform" && actingId && /^[0-9a-f-]{36}$/i.test(actingId)) {
      const { data: tenant } = await supabase.from("condominiums").select("id,name").eq("id", actingId).eq("status", "active").maybeSingle();
      if (tenant) contexts.unshift({ type: "condominium", id: tenant.id, name: tenant.name, role: "Administrador da Plataforma", actingAsPlatform: true });
    }
  }
  return contexts;
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
