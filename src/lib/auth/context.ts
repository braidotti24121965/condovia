import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizedContexts, resolveCurrentContext, type AuthorizedContext } from "@/lib/auth/context-data";
import { hasPermission } from "@/lib/condominium/permissions";
export type { AuthorizedContext } from "@/lib/auth/context-data";

const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  if (error || typeof subject !== "string" || !subject) return { supabase, user: null };
  const email = typeof data.claims.email === "string" ? data.claims.email : "";
  return { supabase, user: { id: subject, email } };
});

export const getAuthorizedContexts = cache(async (platformAdminOverride?: boolean): Promise<AuthorizedContext[]> => {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return [];
  if (!user) return [];
  const [{ data: account }, { data: condominiumRows }, { data: adminRows }, platformPermission] = await Promise.all([
    supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle(),
    supabase.rpc("get_authorized_condominiums"),
    supabase.rpc("get_authorized_administrators"),
    platformAdminOverride === undefined ? supabase.rpc("has_platform_permission", { permission_code: "platform.manage" }) : Promise.resolve({ data: platformAdminOverride, error: null }),
  ]);
  if (!account) return [];
  const platformAdmin = platformPermission.data === true;
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
});

export const requireCurrentContext = cache(async (platformAdminOverride?: boolean) => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("condovia_context")?.value;
  const contexts = await getAuthorizedContexts(platformAdminOverride);
  const resolution = resolveCurrentContext(contexts, selectedId);
  if (resolution.type === "none") redirect("/no-permission");
  if (resolution.type === "choose") redirect("/select-context");
  return resolution.context;
});

export const requireUser = cache(async () => {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) return { supabase: null, user: null };
  if (!user) redirect("/login");
  return { supabase, user };
});

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

export async function getPostLoginDestination(platformAdminOverride?: boolean) {
  const context = await requireCurrentContext(platformAdminOverride);
  if (context.type === "platform") return "/app/platform";
  if (context.type !== "condominium") return "/app/dashboard";
  const { data: canReadDashboard } = await hasPermission("dashboard.read", context.id);
  return canReadDashboard === true ? "/app/dashboard" : "/app/my-units";
}
