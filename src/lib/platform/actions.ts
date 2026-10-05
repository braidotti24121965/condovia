"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformPermission } from "@/lib/platform/access";
import { createAdminClient } from "@/lib/supabase/admin";

const optional = z.string().trim().transform((value) => value || null);
const tenantSchema = z.object({
  clientLegalName: z.string().trim().min(1), condominiumName: z.string().trim().min(1),
  condominiumLegalName: optional, documentNumber: optional, condominiumEmail: z.union([z.literal(""), z.string().trim().email()]).transform((value) => value || null),
  condominiumPhone: optional, condominiumType: z.enum(["vertical", "horizontal", "mixed", "other"]),
  timezone: z.string().trim().min(1), postalCode: optional, street: optional, number: optional,
  complement: optional, district: optional, city: optional, state: optional,
  countryCode: z.string().trim().length(2), adminName: z.string().trim().min(1),
  adminEmail: z.string().trim().email(), adminPhone: optional,
});

function field(form: FormData, name: string) { return String(form.get(name) ?? ""); }

export async function createTenant(form: FormData) {
  const { supabase } = await requirePlatformPermission("platform.tenants.onboard");
  const parsed = tenantSchema.safeParse({
    clientLegalName: field(form,"client_legal_name"), condominiumName: field(form,"condominium_name"),
    condominiumLegalName: field(form,"condominium_legal_name"), documentNumber: field(form,"document_number"),
    condominiumEmail: field(form,"condominium_email"), condominiumPhone: field(form,"condominium_phone"),
    condominiumType: field(form,"condominium_type"), timezone: field(form,"timezone"),
    postalCode: field(form,"postal_code"), street: field(form,"street"), number: field(form,"number"),
    complement: field(form,"complement"), district: field(form,"district"), city: field(form,"city"),
    state: field(form,"state"), countryCode: field(form,"country_code") || "BR",
    adminName: field(form,"admin_name"), adminEmail: field(form,"admin_email").toLowerCase(), adminPhone: field(form,"admin_phone"),
  });
  if (!parsed.success) redirect("/app/platform/tenants/new?error=invalid");
  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!admin || !appUrl) redirect("/app/platform/tenants/new?error=configuration");

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const activation = new URL("/auth/activate", appUrl);
  activation.searchParams.set("admin_invite_token", token);
  let createdAuthUserId: string | undefined;
  const invited = await admin.auth.admin.inviteUserByEmail(parsed.data.adminEmail, { redirectTo: activation.toString() });
  if (invited.error?.code === "email_exists") {
    const otp = await admin.auth.signInWithOtp({ email: parsed.data.adminEmail, options: { shouldCreateUser: false, emailRedirectTo: activation.toString() } });
    if (otp.error) redirect("/app/platform/tenants/new?error=invite");
  } else if (invited.error) redirect("/app/platform/tenants/new?error=invite");
  else createdAuthUserId = invited.data.user?.id;

  const d = parsed.data;
  const { data, error } = await supabase.rpc("create_tenant_with_initial_admin", {
    p_client_legal_name:d.clientLegalName,p_condominium_name:d.condominiumName,p_condominium_legal_name:d.condominiumLegalName,
    p_document_number:d.documentNumber,p_condominium_email:d.condominiumEmail,p_condominium_phone:d.condominiumPhone,
    p_condominium_type:d.condominiumType,p_timezone:d.timezone,p_postal_code:d.postalCode,p_street:d.street,p_number:d.number,
    p_complement:d.complement,p_district:d.district,p_city:d.city,p_state:d.state,p_country_code:d.countryCode,
    p_admin_name:d.adminName,p_admin_email:d.adminEmail,p_admin_phone:d.adminPhone,p_token_hash:tokenHash,
  });
  if (error || !data) {
    if (createdAuthUserId) await admin.auth.admin.deleteUser(createdAuthUserId);
    redirect("/app/platform/tenants/new?error=database");
  }
  redirect("/app/platform?saved=tenant");
}
