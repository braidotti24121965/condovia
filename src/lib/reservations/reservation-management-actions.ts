"use server";

import { revalidatePath } from "next/cache";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { reservationErrorMessage } from "./reservation-presenters";

export type BatchCancellationResult = {
  success: boolean;
  cancelled: number;
  ignored: number;
  failures: Array<{ id: string; error: string }>;
};

export async function manageReservation(form: FormData) {
  const { supabase } = await requireCondominiumPermission("reservations.read");
  const id = String(form.get("reservation_id") || ""); const action = String(form.get("action") || ""); const reason = String(form.get("reason") || "");
  const { error } = await supabase.rpc("manage_reservation", { p_reservation_id: id, p_action: action, p_reason: reason || null });
  if (error) return { success: false, error: reservationErrorMessage(error) };
  revalidatePath("/app/reservations");
  return { success: true };
}

export async function cancelReservationsBatch(ids: string[], reason: string): Promise<BatchCancellationResult> {
  const { supabase, context } = await requireCondominiumPermission("reservations.manage");
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length || uniqueIds.length > 20 || !reason.trim()) {
    return { success: false, cancelled: 0, ignored: 0, failures: [{ id: "batch", error: "Selecione até 20 reservas e informe o motivo do cancelamento." }] };
  }

  let cancelled = 0;
  let ignored = 0;
  const failures: Array<{ id: string; error: string }> = [];
  for (const id of uniqueIds) {
    const { data: reservation, error: lookupError } = await supabase
      .from("reservations")
      .select("id,status,condominium_id")
      .eq("id", id)
      .eq("condominium_id", context.id)
      .maybeSingle();
    if (lookupError) {
      failures.push({ id, error: "Não foi possível validar a reserva." });
      continue;
    }
    if (!reservation || !["pending", "approved"].includes(reservation.status)) {
      ignored += 1;
      continue;
    }
    const { error } = await supabase.rpc("manage_reservation", { p_reservation_id: id, p_action: "cancel", p_reason: reason.trim() });
    if (error) failures.push({ id, error: reservationErrorMessage(error) });
    else cancelled += 1;
  }
  revalidatePath("/app/reservations");
  return { success: failures.length === 0, cancelled, ignored, failures };
}
