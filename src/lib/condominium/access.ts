import { redirect } from "next/navigation";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { friendlyDatabaseError } from "@/lib/condominium/format";

export async function requireCondominiumPermission(permission: string) {
  const { supabase, user } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || !user || context.type !== "condominium") redirect("/no-permission");
  const { data, error } = await supabase.rpc("has_permission", {
    permission_code: permission,
    target_condominium_id: context.id,
  });
  if (error || data !== true) redirect("/no-permission");
  return { supabase, user, context };
}
export { friendlyDatabaseError };
