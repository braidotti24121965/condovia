"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().min(8);

export type ActionState = { error?: string; success?: string };

const displayNameSchema = z.string().trim().min(1).max(120);

export async function updateMyDisplayName(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const name = displayNameSchema.safeParse(formData.get("preferred_name"));
  if (!name.success) return { error: "Informe um nome de exibição entre 1 e 120 caracteres." };
  const supabase = await createClient();
  if (!supabase) return { error: "Não foi possível atualizar o nome de exibição." };
  const { error } = await supabase.rpc("update_my_display_name", { p_preferred_name: name.data });
  if (error) return { error: "Não foi possível atualizar o nome de exibição." };
  revalidatePath("/app/profile");
  revalidatePath("/app", "layout");
  return { success: "Nome de exibição atualizado." };
}

export async function signIn(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(1).safeParse(formData.get("password"));
  if (!email.success || !password.success) return { error: "Informe um e-mail e uma senha válidos." };
  const supabase = await createClient();
  if (!supabase) return { error: "A conexão com o serviço de autenticação não está configurada." };
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error || !data.user) return { error: "Não foi possível entrar com esses dados. Confira as informações e tente novamente." };
  const { data: accountReady, error: accountError } = await supabase.rpc("record_user_login");
  if (accountError || accountReady !== true) {
    await supabase.auth.signOut();
    return { error: "Não foi possível entrar com esses dados. Confira as informações e tente novamente." };
  }
  const { data: platformAdmin } = await supabase.rpc("has_platform_permission", { permission_code: "platform.manage" });
  if (platformAdmin === true) redirect("/app/platform");
  redirect("/app");
}

export async function requestPasswordReset(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Informe um e-mail válido." };
  const supabase = await createClient();
  if (!supabase) return { error: "A recuperação de senha não está configurada." };
  const requestOrigin = "https://homolog-condovia.kynovia.com.br";
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${requestOrigin}/auth/callback?next=%2Freset-password`,
  });
  return { success: "Se houver uma conta para esse e-mail, você receberá as instruções para redefinir a senha." };
}

export async function updatePassword(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirmation = z.string().safeParse(formData.get("confirmation"));
  if (!password.success || !confirmation.success || password.data !== confirmation.data) {
    return { error: "Use uma senha com pelo menos 8 caracteres e confirme-a corretamente." };
  }
  const supabase = await createClient();
  if (!supabase) return { error: "A redefinição de senha não está configurada." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "Não foi possível atualizar a senha. Solicite um novo link de recuperação." };
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete("condovia_context");
  redirect("/login");
}

export async function selectContext(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("contextId"));
  if (!id.success) redirect("/select-context");
  const { getAuthorizedContexts } = await import("@/lib/auth/context");
  const contexts = await getAuthorizedContexts();
  const context = contexts.find((item) => item.id === id.data);
  if (!context) redirect("/select-context?error=invalid-context");
  const cookieStore = await cookies();
  cookieStore.set("condovia_context", context.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  if (context.type === "platform") redirect("/app/platform");
  if (context.type !== "condominium") redirect("/app/dashboard");
  const supabase = await createClient();
  const { data: canReadDashboard } = await supabase!.rpc("has_permission", {
    permission_code: "dashboard.read",
    target_condominium_id: context.id,
  });
  redirect(canReadDashboard === true ? "/app/dashboard" : "/app/my-units");
}

export async function beginPlatformTenantContext(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("condominiumId"));
  if (!id.success) redirect("/app/platform?error=invalid-tenant");
  const supabase = await createClient();
  if (!supabase) redirect("/app/platform?error=unavailable");
  const { error } = await supabase.rpc("begin_platform_tenant_context", { p_condominium_id: id.data });
  if (error) redirect("/app/platform?error=tenant-access-denied");
  const cookieStore = await cookies();
  cookieStore.set("condovia_context", id.data, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 30 });
  cookieStore.set("condovia_acting_context", "platform", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 30 });
  redirect("/app/dashboard");
}

export async function endPlatformTenantContext() {
  const supabase = await createClient();
  if (supabase) await supabase.rpc("end_platform_tenant_context");
  const cookieStore = await cookies();
  cookieStore.delete("condovia_context");
  cookieStore.delete("condovia_acting_context");
  redirect("/app/platform");
}
