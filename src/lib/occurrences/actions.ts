"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";

export async function createOccurrenceAction(formData: FormData) {
  const { supabase } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || context.type !== "condominium") return;
  const { error } = await supabase.rpc("create_occurrence", {
    p_category_id: String(formData.get("category_id") || ""),
    p_title: String(formData.get("title") || "").trim(),
    p_description: String(formData.get("description") || "").trim(),
    p_priority: String(formData.get("priority") || "") || null,
    p_related_unit_id: String(formData.get("related_unit_id") || "") || null,
    p_confidential: formData.get("confidential") === "on",
    p_origin: String(formData.get("origin") || "resident"),
  });
  if (error) return;
  revalidatePath("/app/occurrences");
  return;
}

export async function transitionOccurrenceAction(formData: FormData) {
  const { supabase } = await requireUser();
  await requireCurrentContext();
  if (!supabase) return;
  const { error } = await supabase.rpc("transition_occurrence", {
    p_occurrence_id: String(formData.get("occurrence_id") || ""),
    p_action: String(formData.get("action") || ""),
    p_reason: String(formData.get("reason") || "") || null,
    p_assignee_user_account_id: String(formData.get("assignee_user_account_id") || "") || null,
  });
  if (error) return;
  revalidatePath("/app/occurrences");
  return;
}

export async function addOccurrenceCommentAction(formData: FormData) {
  const { supabase } = await requireUser();
  await requireCurrentContext();
  if (!supabase) return;
  const { error } = await supabase.rpc("add_occurrence_comment", {
    p_occurrence_id: String(formData.get("occurrence_id") || ""),
    p_body: String(formData.get("body") || "").trim(),
    p_visibility: String(formData.get("visibility") || "requester"),
  });
  if (error) return;
  revalidatePath("/app/occurrences");
  return;
}
