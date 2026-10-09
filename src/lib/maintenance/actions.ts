"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";

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

export async function createMaintenanceRequestAction(form: FormData) {
  const { supabase } = await requireUser();
  await requireCurrentContext();
  if (!supabase) return;
  const { error } = await supabase.rpc("create_maintenance_request", {
    p_structure_id: value(form, "structure_id"),
    p_equipment_id: nullable(value(form, "equipment_id")),
    p_title: value(form, "title"),
    p_description: value(form, "description"),
    p_priority: value(form, "priority") || "medium",
  });
  if (error) redirect(`/app/condominium/maintenance/requests?error=${encodeURIComponent(error.message.includes("disabled") ? "Solicitações de moradores estão desativadas neste condomínio." : "Não foi possível registrar a solicitação.")}`);
  revalidatePath("/app/condominium/maintenance/requests");
  redirect("/app/condominium/maintenance/requests?saved=1");
}

export async function decideMaintenanceRequestAction(form: FormData) {
  const { supabase } = await requireUser();
  await requireCurrentContext();
  if (!supabase) return;
  const { error } = await supabase.rpc("decide_maintenance_request", {
    p_request_id: value(form, "request_id"),
    p_decision: value(form, "decision"),
    p_rejection_reason: nullable(value(form, "rejection_reason")),
  });
  if (error) redirect(`/app/condominium/maintenance/requests?error=${encodeURIComponent(error.message.includes("obrigatório") ? "Informe o motivo da rejeição." : "Não foi possível analisar a solicitação.")}`);
  revalidatePath("/app/condominium/maintenance/requests");
  redirect("/app/condominium/maintenance/requests?updated=1");
}
