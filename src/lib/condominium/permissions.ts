import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const hasPermission = cache(async (code: string, condominiumId: string) => {
  const supabase = await createClient();
  if (!supabase) return { data: false, error: null };
  const { data, error } = await supabase.rpc("has_permission", {
    permission_code: code,
    target_condominium_id: condominiumId,
  });
  return { data: data === true, error };
});
