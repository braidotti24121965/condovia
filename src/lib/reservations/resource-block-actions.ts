"use server";

import { revalidatePath } from "next/cache";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { parseDateTimeInTimezone } from "@/lib/gatehouse/timezone";

const text = (form: FormData, key: string) => String(form.get(key) || "").trim();

export async function createResourceBlock(form: FormData) {
  const { supabase, context, user } = await requireCondominiumPermission("reservations.manage");
  const resourceId = text(form, "resource_id"); const date = text(form, "date"); const reason = text(form, "reason"); const mode = text(form, "reservation_mode");
  if (!resourceId || !date || reason.length < 2) throw new Error("Informe a data e o motivo do bloqueio.");
  const { data: account } = await supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle();
  const { data: condo } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  if (!account) throw new Error("Usuário administrativo inválido.");
  const tz = condo?.timezone || "America/Sao_Paulo";
  const startLocal = mode === "day" ? `${date}T00:00` : `${date}T${text(form, "start_time")}`;
  const endLocal = mode === "day" ? `${date}T23:59` : `${date}T${text(form, "end_time")}`;
  const start = parseDateTimeInTimezone(startLocal, tz); const end = parseDateTimeInTimezone(endLocal, tz);
  const { error } = await supabase.from("reservation_resource_blocks").insert({ condominium_id: context.id, resource_id: resourceId, start_at: start.toISOString(), end_at: end.toISOString(), reason, created_by_user_account_id: account.id });
  if (error) throw new Error(error.message.includes("reserva ativa") ? "Existe uma reserva ativa neste período." : error.message);
  revalidatePath("/app/reservations"); revalidatePath("/app/reservations/resources");
}

export async function cancelResourceBlock(form: FormData) {
  const { supabase, context, user } = await requireCondominiumPermission("reservations.manage");
  const { data: account } = await supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle();
  const { error } = await supabase.from("reservation_resource_blocks").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancelled_by_user_account_id: account?.id }).eq("id", text(form, "block_id")).eq("condominium_id", context.id).eq("status", "active");
  if (error) throw new Error(error.message);
  revalidatePath("/app/reservations"); revalidatePath("/app/reservations/resources");
}
