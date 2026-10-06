"use server";

import { revalidatePath } from "next/cache";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { reservationErrorMessage } from "./reservation-presenters";

export async function manageReservation(form: FormData) {
  const { supabase } = await requireCondominiumPermission("reservations.read");
  const id = String(form.get("reservation_id") || ""); const action = String(form.get("action") || ""); const reason = String(form.get("reason") || "");
  const { error } = await supabase.rpc("manage_reservation", { p_reservation_id: id, p_action: action, p_reason: reason || null });
  if (error) return { success: false, error: reservationErrorMessage(error) };
  revalidatePath("/app/reservations");
  return { success: true };
}
