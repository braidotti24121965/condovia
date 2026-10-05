"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { normalizePostalCode } from "@/lib/condominium/format";
import { requirePlatformPermission } from "@/lib/platform/access";
import { mapTenantServerError, tenantValuesFromForm, validateTenantValues, type TenantActionState } from "@/lib/platform/tenant-form";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createTenant(_previous: TenantActionState, form: FormData): Promise<TenantActionState> {
  const { supabase } = await requirePlatformPermission("platform.tenants.onboard");
  const values = tenantValuesFromForm(form);
  const fieldErrors = validateTenantValues(values);
  if (Object.keys(fieldErrors).length) return { values, fieldErrors };
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!admin || !appUrl) return { values, fieldErrors: {}, message: "O onboarding está temporariamente indisponível. Tente novamente mais tarde." };

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const activation = new URL("/auth/activate", appUrl);
  activation.searchParams.set("admin_invite_token", token);
  let createdAuthUserId: string | undefined;
  const adminEmail = values.admin_email.trim().toLowerCase();
  const invited = await admin.auth.admin.inviteUserByEmail(adminEmail, { redirectTo: activation.toString() });
  if (invited.error?.code === "email_exists") {
    const otp = await admin.auth.signInWithOtp({ email: adminEmail, options: { shouldCreateUser: false, emailRedirectTo: activation.toString() } });
    if (otp.error) return { values, fieldErrors: {}, message: "Não foi possível enviar o convite. Confira o e-mail e tente novamente." };
  } else if (invited.error) return { values, fieldErrors: {}, message: "Não foi possível enviar o convite. Confira o e-mail e tente novamente." };
  else createdAuthUserId = invited.data.user?.id;

  const { data, error } = await supabase.rpc("create_tenant_with_initial_admin", {
    p_client_legal_name:values.client_legal_name.trim(),p_condominium_name:values.condominium_name.trim(),p_condominium_legal_name:values.condominium_legal_name.trim() || null,
    p_document_number:values.document_number.replace(/\D/g, "") || null,p_condominium_email:values.condominium_email.trim() || null,p_condominium_phone:values.condominium_phone.trim() || null,
    p_condominium_type:values.condominium_type,p_timezone:values.timezone.trim(),p_postal_code:normalizePostalCode(values.postal_code) || null,p_street:values.street.trim() || null,p_number:values.number.trim() || null,
    p_complement:values.complement.trim() || null,p_district:values.district.trim() || null,p_city:values.city.trim() || null,p_state:values.state.trim() || null,p_country_code:values.country_code.trim().toUpperCase(),
    p_admin_name:values.admin_name.trim(),p_admin_email:adminEmail,p_admin_phone:values.admin_phone.trim() || null,p_token_hash:tokenHash,
  });
  if (error || !data) {
    if (createdAuthUserId) await admin.auth.admin.deleteUser(createdAuthUserId);
    return { values, ...mapTenantServerError(error?.message) };
  }
  redirect("/app/platform?saved=tenant");
}
