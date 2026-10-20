import { redirect } from "next/navigation";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { friendlyDatabaseError } from "@/lib/condominium/format";
import { cache } from "react";

export const hasPermission = cache(async (code: string, condominiumId: string) => {
  const supabase = await createClient();
  if (!supabase) return { data: false, error: null };
  const { data, error } = await supabase.rpc("has_permission", {
    permission_code: code,
    target_condominium_id: condominiumId,
  });
  return { data: data === true, error };
});

export async function requireCondominiumPermission(permission: string) {
  const { supabase, user } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || !user || context.type !== "condominium") redirect("/no-permission");
  const { data, error } = await hasPermission(permission, context.id);
  if (error || data !== true) redirect("/no-permission");
  return { supabase, user, context };
}
export { friendlyDatabaseError };
