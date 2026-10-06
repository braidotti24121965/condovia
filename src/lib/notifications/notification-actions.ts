"use server";

import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import type { NotificationItem } from "./notification-types";

export async function getNotifications(limit = 25) {
  const { supabase, user } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || !user || context.type !== "condominium") return { notifications: [], timeZone: "America/Sao_Paulo" };
  const [{ data: notifications }, { data: condominium }] = await Promise.all([
    supabase.from("notifications").select("id,notification_type,title,message,entity_type,entity_id,read_at,created_at").eq("condominium_id", context.id).order("created_at", { ascending: false }).limit(limit),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
  ]);
  return { notifications: (notifications || []) as NotificationItem[], timeZone: condominium?.timezone || "America/Sao_Paulo" };
}

export async function markNotificationAsRead(notificationId: string) {
  const { supabase } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || context.type !== "condominium") return { success: false };
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId).eq("condominium_id", context.id).is("read_at", null);
  return { success: !error };
}

export async function markAllNotificationsAsRead() {
  const { supabase } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || context.type !== "condominium") return { success: false };
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("condominium_id", context.id).is("read_at", null);
  return { success: !error };
}
