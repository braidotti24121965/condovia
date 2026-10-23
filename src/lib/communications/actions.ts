"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { validateCommunication } from "@/lib/communications/audience";

const PAGE = "/app/condominium/communications";

const nullable = (item: string) => item || null;

async function currentAccountId(supabase: Awaited<ReturnType<typeof requireCondominiumPermission>>["supabase"], authUserId: string) {
  const { data } = await supabase.from("user_accounts").select("id").eq("auth_user_id", authUserId).maybeSingle();
  return data?.id ?? null;
}

export async function publishCommunicationAction(form: FormData) {
  const { supabase, user, context } = await requireCondominiumPermission("communications.publish");
  const draft = {
    title: String(form.get("title") ?? ""),
    body: String(form.get("body") ?? ""),
    structureId: nullable(String(form.get("structure_id") ?? "")),
  };
  const problem = validateCommunication(draft);
  if (problem) {
    redirect(`${PAGE}?error=${encodeURIComponent(problem === "title" ? "Título deve ter entre 3 e 160 caracteres." : "Texto deve ter entre 3 e 5000 caracteres.")}`);
  }

  const accountId = await currentAccountId(supabase, user.id);
  const { error } = await supabase.from("communications").insert({
    condominium_id: context.id,
    title: draft.title.trim(),
    body: draft.body.trim(),
    structure_id: draft.structureId,
    status: "published",
    published_at: new Date().toISOString(),
    published_by: accountId,
  });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("Não foi possível publicar o comunicado.")}`);

  revalidatePath(PAGE);
  redirect(`${PAGE}?saved=1`);
}

export async function markCommunicationReadAction(form: FormData) {
  const { supabase, user, context } = await requireCondominiumPermission("communications.read");
  const communicationId = String(form.get("communication_id") ?? "");
  const accountId = await currentAccountId(supabase, user.id);
  if (!communicationId || !accountId) redirect(`${PAGE}?error=${encodeURIComponent("Não foi possível confirmar a leitura.")}`);

  const { error } = await supabase.from("communication_reads").upsert(
    { communication_id: communicationId, condominium_id: context.id, user_account_id: accountId },
    { onConflict: "communication_id,user_account_id", ignoreDuplicates: true },
  );
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("Não foi possível confirmar a leitura.")}`);

  revalidatePath(PAGE);
  redirect(`${PAGE}?updated=1`);
}
