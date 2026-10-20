import { redirect } from "next/navigation";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { friendlyDatabaseError } from "@/lib/condominium/format";
import { hasPermission } from "@/lib/condominium/permissions";

export { hasPermission } from "@/lib/condominium/permissions";

export async function requireCondominiumPermission(permission: string) {
  const { supabase, user } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || !user || context.type !== "condominium") redirect("/no-permission");
  const { data, error } = await hasPermission(permission, context.id);
  if (error || data !== true) redirect("/no-permission");
  return { supabase, user, context };
}
export { friendlyDatabaseError };
