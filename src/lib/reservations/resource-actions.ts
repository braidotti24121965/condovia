"use server";

import { revalidatePath } from "next/cache";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { parseCurrencyBRL, toMinutes, validateResourceHours, validateResourceValues, type MinuteUnit, type ResourceHourInput } from "./resource-validation";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const numberOrNull = (form: FormData, key: string) => value(form, key) === "" ? null : Number(value(form, key));
const minutes = (form: FormData, key: string, fallback: number | null) => {
  const raw = value(form, `${key}_value`);
  return raw ? toMinutes(raw, (value(form, `${key}_unit`) || "minutes") as MinuteUnit) : fallback;
};

export async function saveReservableResource(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("reservations.resources.manage");
  const usageFee = parseCurrencyBRL(value(form, "usage_fee"));
  const values = { name: value(form, "name"), capacity: value(form, "capacity"), minimum_advance_minutes: String(minutes(form, "minimum_advance", 0) ?? ""), maximum_advance_minutes: String(minutes(form, "maximum_advance", null) ?? ""), minimum_duration_minutes: String(minutes(form, "minimum_duration", 30) ?? ""), maximum_duration_minutes: String(minutes(form, "maximum_duration", null) ?? ""), buffer_minutes: String(minutes(form, "buffer", 0) ?? ""), cancellation_deadline_minutes: String(minutes(form, "cancellation_deadline", 0) ?? ""), usage_fee: usageFee };
  const errors = validateResourceValues(values);
  const hours = JSON.parse(value(form, "hours") || "[]") as ResourceHourInput[];
  const hourErrors = validateResourceHours(hours);
  if (Object.keys(errors).length || hourErrors.length) throw new Error([...Object.values(errors), ...hourErrors].join(" "));
  const id = value(form, "id");
  const payload = {
    condominium_id: context.id, name: value(form, "name"), description: value(form, "description") || null, location: value(form, "location") || null,
    capacity: numberOrNull(form, "capacity"), status: value(form, "status") || "active", requires_approval: form.get("requires_approval") === "on",
    minimum_advance_minutes: Number(values.minimum_advance_minutes), maximum_advance_minutes: values.maximum_advance_minutes === "" ? null : Number(values.maximum_advance_minutes), minimum_duration_minutes: Number(values.minimum_duration_minutes), maximum_duration_minutes: values.maximum_duration_minutes === "" ? null : Number(values.maximum_duration_minutes), buffer_minutes: Number(values.buffer_minutes), cancellation_allowed: form.get("cancellation_allowed") === "on", cancellation_deadline_minutes: Number(values.cancellation_deadline_minutes), usage_fee: usageFee === "" ? null : Number(usageFee), instructions: value(form, "instructions") || null, updated_at: new Date().toISOString(),
  };
  const result = id ? await supabase.from("reservable_resources").update(payload).eq("id", id).eq("condominium_id", context.id).select("id").single() : await supabase.from("reservable_resources").insert(payload).select("id").single();
  if (result.error || !result.data) throw new Error(result.error?.message || "Não foi possível salvar o recurso.");
  await supabase.from("reservable_resource_hours").delete().eq("resource_id", result.data.id).eq("condominium_id", context.id);
  if (hours.length) {
    const { error } = await supabase.from("reservable_resource_hours").insert(hours.map((hour) => ({ ...hour, resource_id: result.data.id, condominium_id: context.id, updated_at: new Date().toISOString() })));
    if (error) throw new Error(error.message);
  }
  revalidatePath("/app/reservations/resources");
}
