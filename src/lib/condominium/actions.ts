"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { friendlyDatabaseError } from "@/lib/condominium/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { safePersonRelationshipReturnPath } from "@/lib/condominium/person-return";

function value(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }
function nullable(value: string) { return value || null; }
function numberOrNull(value: string) { return value === "" ? null : Number(value); }

export async function saveCondominiumProfile(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("condominiums.manage");
  const { error } = await supabase.rpc("save_condominium_profile", {
    target_condominium_id: context.id,
    p_name: value(form, "name"), p_legal_name: nullable(value(form, "legal_name")),
    p_document_number: nullable(value(form, "document_number")), p_email: nullable(value(form, "email")),
    p_phone: nullable(value(form, "phone")), p_condominium_type: value(form, "condominium_type"),
    p_timezone: value(form, "timezone"), p_postal_code: nullable(value(form, "postal_code")),
    p_street: value(form, "street"), p_number: nullable(value(form, "number")),
    p_complement: nullable(value(form, "complement")), p_district: nullable(value(form, "district")),
    p_city: value(form, "city"), p_state: value(form, "state"), p_country_code: value(form, "country_code") || "BR",
  });
  if (error) redirect(`/app/condominium?error=${encodeURIComponent(friendlyDatabaseError(error.message))}`);
  revalidatePath("/app/condominium");
  redirect("/app/condominium?saved=1");
}

export async function saveStructure(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("structures.manage");
  const id = value(form, "id");
  const payload = {
    condominium_id: context.id,
    parent_id: nullable(value(form, "parent_id")),
    structure_type: value(form, "structure_type"), name: value(form, "name"),
    code: nullable(value(form, "code")), sort_order: Number(value(form, "sort_order") || 0),
    status: value(form, "status") || "active",
  };
  const result = id
    ? await supabase.from("condominium_structures").update(payload).eq("id", id).eq("condominium_id", context.id)
    : await supabase.from("condominium_structures").insert(payload);
  if (result.error) redirect(`/app/condominium/structures?error=${encodeURIComponent(friendlyDatabaseError(result.error.message))}`);
  revalidatePath("/app/condominium/structures");
  redirect("/app/condominium/structures?saved=1");
}

export async function saveUnit(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("units.manage");
  const id = value(form, "id");
  const payload = {
    condominium_id: context.id,
    structure_id: nullable(value(form, "structure_id")), code: value(form, "code"),
    display_name: nullable(value(form, "display_name")), unit_type: value(form, "unit_type"),
    floor: nullable(value(form, "floor")), area: numberOrNull(value(form, "area")),
    ownership_fraction: numberOrNull(value(form, "ownership_fraction")),
    operational_status: value(form, "operational_status") || "active", notes: nullable(value(form, "notes")),
  };
  const result = id
    ? await supabase.from("units").update(payload).eq("id", id).eq("condominium_id", context.id)
    : await supabase.from("units").insert(payload);
  if (result.error) redirect(`/app/condominium/units?error=${encodeURIComponent(friendlyDatabaseError(result.error.message))}`);
  revalidatePath("/app/condominium/units");
  if (id) revalidatePath(`/app/condominium/units/${id}`);
  redirect("/app/condominium/units?saved=1");
}

export async function savePerson(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("people.manage");
  const returnKind=value(form,"return_kind");
  const returnPath=safePersonRelationshipReturnPath(value(form,"return_path"),returnKind);
  const resumeQuery=returnPath?`&returnTo=${encodeURIComponent(returnPath)}&relationship=${returnKind}`:"";
  const { data, error } = await supabase.rpc("resolve_or_create_person_for_condominium", {
    target_condominium_id: context.id,
    p_full_name: value(form, "full_name"), p_preferred_name: nullable(value(form, "preferred_name")),
    p_birth_date: nullable(value(form, "birth_date")), p_cpf: nullable(value(form, "cpf")),
    p_email: nullable(value(form, "email")), p_phone: nullable(value(form, "phone")),
  });
  if (error || !data) redirect(`/app/condominium/people/new?error=${encodeURIComponent(error?.message.includes("Possível pessoa existente") ? "Possível pessoa existente. Revise a lista antes de cadastrar." : "Não foi possível salvar a pessoa com os dados informados.")}${resumeQuery}`);
  revalidatePath("/app/condominium/people");
  if(returnPath){
    revalidatePath(new URL(returnPath,"https://condovia.invalid").pathname);
    const separator=returnPath.includes("?")?"&":"?";
    redirect(`${returnPath}${separator}relationship=${returnKind}&newPersonId=${encodeURIComponent(data)}`);
  }
  redirect(`/app/condominium/people/${data}?saved=1`);
}

export async function updatePerson(form: FormData) {
  const { supabase } = await requireCondominiumPermission("people.manage"); const id=value(form,"person_id");
  const { error } = await supabase.from("people").update({ full_name:value(form,"full_name"), preferred_name:nullable(value(form,"preferred_name")), birth_date:nullable(value(form,"birth_date")), status:value(form,"status") }).eq("id",id);
  if (error) redirect(`/app/condominium/people/${id}?error=${encodeURIComponent(friendlyDatabaseError(error.message))}`);
  revalidatePath(`/app/condominium/people/${id}`); revalidatePath("/app/condominium/people"); redirect(`/app/condominium/people/${id}?saved=1`);
}

export async function setPersonCpf(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("people.manage"); const id=value(form,"person_id");
  const { error } = await supabase.rpc("set_person_cpf", { p_person_id:id, p_condominium_id:context.id, p_cpf:value(form,"cpf"), p_confirm:value(form,"confirm") === "yes" });
  if (error) redirect(`/app/condominium/people/${id}?error=${encodeURIComponent(error.message.includes("Confirme")?"Confirme a alteração do CPF.":"Não foi possível validar o documento informado.")}`);
  revalidatePath(`/app/condominium/people/${id}`); redirect(`/app/condominium/people/${id}?saved=1`);
}

export async function savePersonContact(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("people.manage");
  const personId = value(form, "person_id");
  const contactType = value(form, "contact_type");
  const { error } = await supabase.rpc("save_person_contact", {
    p_person_id: personId,
    p_condominium_id: context.id,
    p_contact_type: contactType,
    p_contact_id: nullable(value(form, "contact_id")),
    p_value: value(form, "value"),
    p_kind: value(form, "kind") || (contactType === "email" ? "email" : "mobile"),
    p_is_primary: value(form, "is_primary") === "yes",
    p_is_whatsapp: value(form, "is_whatsapp") === "yes",
  });
  if (error) redirect(`/app/condominium/people/${personId}?error=${encodeURIComponent(friendlyDatabaseError(error.message))}`);
  revalidatePath(`/app/condominium/people/${personId}`);
  revalidatePath("/app/condominium/people");
  redirect(`/app/condominium/people/${personId}?saved=contact`);
}

export async function inviteResident(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("users.invite");
  const personId = value(form, "person_id");
  const email = value(form, "email").toLowerCase();
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: invitationId, error } = await supabase.rpc("issue_resident_invitation", {
    p_person_id: personId,
    p_condominium_id: context.id,
    p_email: email,
    p_token_hash: tokenHash,
  });
  if (error || !invitationId) {
    redirect(`/app/condominium/people/${personId}?error=${encodeURIComponent("A pessoa não está elegível para convite neste condomínio.")}`);
  }

  const cancel = async () => {
    await supabase.rpc("cancel_resident_invitation", { p_invitation_id: invitationId });
  };
  const admin = createAdminClient();
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!admin || !configuredAppUrl) {
    await cancel();
    redirect(`/app/condominium/people/${personId}?error=${encodeURIComponent("O envio de convites não está configurado neste ambiente local.")}`);
  }
  let redirectTo: string;
  try {
    const target = new URL("/auth/callback", configuredAppUrl);
    target.searchParams.set("invite_token", token);
    redirectTo = target.toString();
  } catch {
    await cancel();
    redirect(`/app/condominium/people/${personId}?error=${encodeURIComponent("O envio de convites não está configurado neste ambiente local.")}`);
  }

  const invited = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (invited.error) {
    if (invited.error.code === "email_exists") {
      // Use an isolated implicit Auth client: a PKCE verifier stored in the
      // inviter's cookies would not exist in the recipient's browser.
      const signIn = await admin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo! },
      });
      if (!signIn.error) {
        revalidatePath(`/app/condominium/people/${personId}`);
        redirect(`/app/condominium/people/${personId}?saved=invitation`);
      }
    }
    await cancel();
    redirect(`/app/condominium/people/${personId}?error=${encodeURIComponent("Não foi possível enviar o convite. Confira o contato e tente novamente.")}`);
  }
  revalidatePath(`/app/condominium/people/${personId}`);
  redirect(`/app/condominium/people/${personId}?saved=invitation`);
}

export async function addPersonRelationship(form: FormData) {
  const kind = value(form, "kind");
  const permission = kind === "ownership" ? "ownerships.manage" : kind === "occupancy" ? "residents.manage" : "financial_responsibilities.manage";
  const { supabase, context } = await requireCondominiumPermission(permission);
  const unitId = value(form, "unit_id"); const personId = value(form, "person_id");
  const startsAt = value(form, "starts_at"); const endsAt = nullable(value(form, "ends_at"));
  const defaultBasePath = `/app/condominium/${kind === "ownership" ? "owners" : "residents"}`;
  const returnPath = safePersonRelationshipReturnPath(value(form, "return_to"), kind) || defaultBasePath;
  let error: { message: string } | null = null;
  if (kind === "ownership") {
    ({ error } = await supabase.from("unit_ownerships").insert({ condominium_id: context.id, unit_id: unitId, person_id: personId, ownership_percentage: numberOrNull(value(form, "ownership_percentage")), starts_at: startsAt, ends_at: endsAt, notes: nullable(value(form, "notes")) }));
  } else if (kind === "occupancy" && value(form, "is_primary") === "true") {
    ({ error } = await supabase.rpc("change_primary_resident", { p_unit_id: unitId, p_condominium_id: context.id, p_person_id: personId, p_starts_at: startsAt, p_occupancy_type: value(form, "occupancy_type") || "tenant", p_ends_at: endsAt }));
  } else if (kind === "occupancy") {
    ({ error } = await supabase.from("unit_occupancies").insert({ condominium_id: context.id, unit_id: unitId, person_id: personId, occupancy_type: value(form, "occupancy_type"), is_primary: false, starts_at: startsAt, ends_at: endsAt, notes: nullable(value(form, "notes")) }));
  } else {
    ({ error } = await supabase.rpc("set_unit_financial_responsibility", { p_unit_id: unitId, p_condominium_id: context.id, p_person_id: personId, p_starts_at: startsAt, p_notes: nullable(value(form, "notes")) }));
  }
  const separator = returnPath.includes("?") ? "&" : "?";
  if (error) redirect(`${returnPath}${separator}error=${encodeURIComponent(friendlyDatabaseError(error.message))}`);
  revalidatePath("/app/condominium/owners"); revalidatePath("/app/condominium/residents"); revalidatePath("/app/condominium/units");
  revalidatePath(`/app/condominium/people/${personId}`);
  revalidatePath(`/app/condominium/units/${unitId}`);
  revalidatePath("/app/my-units");
  redirect(`${returnPath}${separator}saved=1`);
}

export async function endPersonRelationship(form: FormData) {
  const kind = value(form, "kind");
  const permission = kind === "ownership" ? "ownerships.manage" : kind === "occupancy" ? "residents.manage" : "financial_responsibilities.manage";
  const { supabase, context } = await requireCondominiumPermission(permission);
  const table = kind === "ownership" ? "unit_ownerships" : kind === "occupancy" ? "unit_occupancies" : "unit_financial_responsibilities";
  const { data: ended, error } = await supabase.from(table).update({ ends_at: value(form, "ends_at") }).eq("id", value(form, "id")).eq("condominium_id", context.id).select("unit_id").maybeSingle();
  if (error) redirect(`/app/condominium/people/${value(form, "person_id")}?error=${encodeURIComponent(friendlyDatabaseError(error.message))}`);
  if (!ended) redirect(`/app/condominium/people/${value(form, "person_id")}?error=${encodeURIComponent("Não foi possível encerrar este vínculo.")}`);
  revalidatePath(`/app/condominium/people/${value(form, "person_id")}`); revalidatePath("/app/condominium/owners"); revalidatePath("/app/condominium/residents");
  revalidatePath(`/app/condominium/units/${ended.unit_id}`);
  revalidatePath("/app/my-units");
  redirect(`/app/condominium/people/${value(form, "person_id")}?saved=1`);
}
