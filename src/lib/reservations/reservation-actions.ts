"use server";

import { revalidatePath } from "next/cache";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { parseDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { reservationErrorMessage } from "./reservation-presenters";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function createReservation(form: FormData): Promise<{ success: boolean; error?: string; requiresApproval?: boolean }> {
  const { supabase, context, user } = await requireCondominiumPermission("reservations.create");
  try {
    const resourceId = text(form, "resource_id"); const unitId = text(form, "unit_id"); const localStart = text(form, "starts_at"); const localEnd = text(form, "ends_at");
    if (!resourceId || !unitId || !localStart || !localEnd) throw new Error("Informe recurso, unidade, início e fim.");
    const [{ data: resource }, { data: account }] = await Promise.all([
    supabase.from("reservable_resources").select("id,status,requires_approval,minimum_advance_minutes,maximum_advance_minutes,minimum_duration_minutes,maximum_duration_minutes,buffer_minutes,usage_fee").eq("id", resourceId).eq("condominium_id", context.id).maybeSingle(),
    supabase.from("user_accounts").select("id,person_id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle(),
    ]);
    if (!resource || resource.status !== "active" || !account) throw new Error("Recurso ou usuário inválido.");
    const { data: unit } = await supabase.from("units").select("id").eq("id", unitId).eq("condominium_id", context.id).eq("operational_status", "active").maybeSingle();
    if (!unit) throw new Error("Unidade inválida para este condomínio.");
    const { data: condo } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
    const timeZone = condo?.timezone || "America/Sao_Paulo";
    const startsAt = parseDateTimeInTimezone(localStart, timeZone); const endsAt = parseDateTimeInTimezone(localEnd, timeZone);
    const duration = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000); const advance = Math.round((startsAt.getTime() - Date.now()) / 60000);
    if (duration < resource.minimum_duration_minutes || (resource.maximum_duration_minutes != null && duration > resource.maximum_duration_minutes)) throw new Error("A duração está fora das regras do recurso.");
    if (advance < resource.minimum_advance_minutes || (resource.maximum_advance_minutes != null && advance > resource.maximum_advance_minutes)) throw new Error("A antecedência está fora das regras do recurso.");
    const localDate = localStart.slice(0, 10); const weekday = new Date(`${localDate}T00:00:00Z`).getUTCDay(); const startTime = localStart.slice(11, 16); const endTime = localEnd.slice(11, 16);
    const { data: hours } = await supabase.from("reservable_resource_hours").select("start_time,end_time").eq("resource_id", resourceId).eq("condominium_id", context.id).eq("weekday", weekday).eq("active", true);
    if (!hours?.some((hour) => startTime >= String(hour.start_time).slice(0, 5) && endTime <= String(hour.end_time).slice(0, 5))) throw new Error("O horário está fora da disponibilidade semanal.");
    const { error } = await supabase.from("reservations").insert({ condominium_id: context.id, resource_id: resourceId, unit_id: unitId, requester_person_id: account.person_id, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), status: resource.requires_approval ? "pending" : "approved", notes: text(form, "notes") || null, usage_fee: resource.usage_fee });
    if (error) throw new Error(error.code === "23P01" ? "Já existe uma reserva nesse período." : error.message);
    revalidatePath("/app/reservations");
    return { success: true, requiresApproval: resource.requires_approval };
  } catch (error) {
    return { success: false, error: reservationErrorMessage(error) };
  }
}
