"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { friendlyDatabaseError } from "@/lib/condominium/format";

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
