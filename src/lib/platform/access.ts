import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/context";

export async function requirePlatformPermission(permissionCode: string) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) redirect("/login");
  const { data: allowed } = await supabase.rpc("has_platform_permission", { permission_code: permissionCode });
  if (allowed !== true) redirect("/no-permission");
  return { supabase, user };
}
