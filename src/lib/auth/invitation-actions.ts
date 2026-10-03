"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function completeResidentInvitation(token: string): Promise<{ success: boolean }> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { success: false };
  const supabase = await createClient();
  if (!supabase) return { success: false };
  const { data: condominiumId, error } = await supabase.rpc("accept_resident_invitation", { p_token: token });
  if (error || typeof condominiumId !== "string") {
    await supabase.auth.signOut();
    return { success: false };
  }
  const { data: ready, error: loginError } = await supabase.rpc("record_user_login");
  if (loginError || ready !== true) {
    await supabase.auth.signOut();
    return { success: false };
  }
  const cookieStore = await cookies();
  cookieStore.set("condovia_context", condominiumId, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return { success: true };
}
