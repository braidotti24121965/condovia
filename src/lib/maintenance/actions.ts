"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (item: string) => item || null;

export async function saveEquipment(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.manage");
  const id = value(form, "id");
  const payload = {
    condominium_id: context.id, structure_id: value(form, "structure_id"),
    category_id: nullable(value(form, "category_id")), identification: value(form, "identification"),
    location: nullable(value(form, "location")), manufacturer: nullable(value(form, "manufacturer")),
    model: nullable(value(form, "model")), serial_number: nullable(value(form, "serial_number")),
    installed_at: nullable(value(form, "installed_at")), warranty_until: nullable(value(form, "warranty_until")),
    status: value(form, "status") || "active", notes: nullable(value(form, "notes")),
  };
  const result = id
    ? await supabase.from("maintenance_equipment").update(payload).eq("id", id).eq("condominium_id", context.id)
    : await supabase.from("maintenance_equipment").insert(payload);
  if (result.error) redirect(`/app/condominium/maintenance?error=${encodeURIComponent("Não foi possível salvar o equipamento.")}`);
  revalidatePath("/app/condominium/maintenance");
  redirect("/app/condominium/maintenance?saved=1");
}

export async function saveMaintenanceSettings(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.manage");
  const { error } = await supabase.from("maintenance_settings").upsert({
    condominium_id: context.id, resident_requests_enabled: form.get("resident_requests_enabled") === "on",
    financial_approval_limit: Number(value(form, "financial_approval_limit") || 0),
    alert_advance_days: Number(value(form, "alert_advance_days") || 7),
    priority_low_days: Number(value(form, "priority_low_days") || 15),
    priority_medium_days: Number(value(form, "priority_medium_days") || 7),
    priority_high_hours: Number(value(form, "priority_high_hours") || 48),
  });
  if (error) redirect(`/app/condominium/maintenance?error=${encodeURIComponent("Não foi possível salvar as configurações.")}`);
  revalidatePath("/app/condominium/maintenance");
  redirect("/app/condominium/maintenance?saved=1");
}

export async function saveEquipmentCategory(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.manage");
  const name = value(form, "name");
  const { error } = await supabase.from("maintenance_equipment_categories").insert({ condominium_id: context.id, name });
  if (error) redirect(`/app/condominium/maintenance?error=${encodeURIComponent("Não foi possível salvar a categoria.")}`);
  revalidatePath("/app/condominium/maintenance");
  redirect("/app/condominium/maintenance?saved=1");
}
