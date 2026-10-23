"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { friendlyDatabaseError } from "@/lib/condominium/format";
import { getCondominiumUnits, todayInTimezone } from "@/lib/condominium/people-data";
import { eligibleUnits, parseLotsInGoodStanding } from "@/lib/voting/lots-in-good-standing";
import { evaluateVote, type Convocation, type VotingMatter } from "@/lib/voting/quorum";
import { loadVotingRoll } from "@/lib/voting/assembly-data";

const MATTERS: VotingMatter[] = ["statute_change", "member_removal", "property_sale", "dissolution", "other"];
const CONVOCATIONS: Convocation[] = ["first", "second"];
const BASE = "/app/condominium/assemblies";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function wholeNumber(form: FormData, key: string) {
  const raw = value(form, key);
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

function failDetail(id: string, message: string): never {
  redirect(`${BASE}/${id}?error=${encodeURIComponent(message)}`);
}

export async function createAssemblyAction(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("assemblies.manage");
  const title = value(form, "title");
  const matter = value(form, "matter") as VotingMatter;
  const convocation = value(form, "convocation") as Convocation;
  const heldOn = value(form, "held_on");

  if (title.length < 3 || title.length > 160) redirect(`${BASE}?error=${encodeURIComponent("Informe um título entre 3 e 160 caracteres.")}`);
  if (!MATTERS.includes(matter) || !CONVOCATIONS.includes(convocation)) redirect(`${BASE}?error=${encodeURIComponent("Matéria ou convocação inválida.")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(heldOn) || Number.isNaN(new Date(`${heldOn}T12:00:00-03:00`).getTime())) {
    redirect(`${BASE}?error=${encodeURIComponent("Informe uma data válida.")}`);
  }

  // Brasil não tem horário de verão desde 2019: o meio-dia com offset fixo mantém a data civil.
  const { data, error } = await supabase
    .from("assemblies")
    .insert({ condominium_id: context.id, title, matter, convocation, held_at: `${heldOn}T12:00:00-03:00` })
    .select("id")
    .single();
  if (error || !data) redirect(`${BASE}?error=${encodeURIComponent(friendlyDatabaseError(error?.message ?? "Não foi possível criar a assembleia."))}`);

  revalidatePath(BASE);
  redirect(`${BASE}/${data.id}?created=1`);
}

export async function saveEligibleUnitsAction(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("assemblies.manage");
  const assemblyId = value(form, "assembly_id");
  const parsed = parseLotsInGoodStanding(value(form, "lots"));

  if (!parsed.codes.length) failDetail(assemblyId, "Informe ao menos um lote em dia.");

  const units = await getCondominiumUnits(supabase, context.id);
  const matched = eligibleUnits(units, parsed.codes);
  const matchedCodes = new Set(matched.map((unit) => unit.code.replace(/\s+/g, "").toUpperCase()));
  const notFound = parsed.codes.filter((code) => !matchedCodes.has(code)).length;

  const { error: deleteError } = await supabase.from("assembly_eligible_units").delete().eq("assembly_id", assemblyId).eq("condominium_id", context.id);
  if (deleteError) failDetail(assemblyId, friendlyDatabaseError(deleteError.message));

  const { error } = await supabase.from("assembly_eligible_units").insert(
    matched.map((unit) => ({ assembly_id: assemblyId, condominium_id: context.id, unit_id: unit.id })),
  );
  if (error) failDetail(assemblyId, friendlyDatabaseError(error.message));

  revalidatePath(`${BASE}/${assemblyId}`);
  redirect(`${BASE}/${assemblyId}?eligible=${matched.length}&notFound=${notFound}&invalid=${parsed.invalid.length}`);
}

export async function saveAttendanceAction(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("assemblies.manage");
  const assemblyId = value(form, "assembly_id");
  const today = todayInTimezone(await condominiumTimezone(supabase, context.id));
  const roll = await loadVotingRoll(supabase, context.id, assemblyId, today);

  // Só são aceitos associados da lista de votantes; qualquer outro id enviado é descartado.
  const voterIds = new Set(roll.voters.map((voter) => voter.personId));
  const personIds = [...new Set(form.getAll("person_id").map(String))].filter((id) => voterIds.has(id));

  const { error: deleteError } = await supabase.from("assembly_attendance").delete().eq("assembly_id", assemblyId).eq("condominium_id", context.id);
  if (deleteError) failDetail(assemblyId, friendlyDatabaseError(deleteError.message));

  if (personIds.length) {
    const { error } = await supabase.from("assembly_attendance").insert(
      personIds.map((personId) => ({ assembly_id: assemblyId, condominium_id: context.id, person_id: personId })),
    );
    if (error) failDetail(assemblyId, friendlyDatabaseError(error.message));
  }

  revalidatePath(`${BASE}/${assemblyId}`);
  redirect(`${BASE}/${assemblyId}?attendance=${personIds.length}`);
}

export async function saveResultsAction(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("assemblies.manage");
  const assemblyId = value(form, "assembly_id");

  const { data: assembly } = await supabase
    .from("assemblies")
    .select("matter,convocation")
    .eq("id", assemblyId)
    .eq("condominium_id", context.id)
    .maybeSingle();
  if (!assembly) redirect(`${BASE}?error=${encodeURIComponent("Assembleia não encontrada.")}`);

  const today = todayInTimezone(await condominiumTimezone(supabase, context.id));
  const roll = await loadVotingRoll(supabase, context.id, assemblyId, today);
  if (!roll.eligibleUnitIds.size) failDetail(assemblyId, "Importe a lista de lotes em dia antes de lançar os totais.");

  const presentVotes = wholeNumber(form, "present_votes");
  const inFavor = wholeNumber(form, "votes_in_favor");
  const against = wholeNumber(form, "votes_against");
  const abstain = wholeNumber(form, "votes_abstain");
  if (presentVotes === null || inFavor === null || against === null || abstain === null) {
    failDetail(assemblyId, "Informe os totais como números inteiros, sem sinal.");
  }
  if (presentVotes > roll.eligibleUnitIds.size) {
    failDetail(assemblyId, `Os votos presentes não podem passar de ${roll.eligibleUnitIds.size} lotes em dia.`);
  }
  if (inFavor + against + abstain > presentVotes) {
    failDetail(assemblyId, "A soma de favoráveis, contrários e abstenções não pode passar dos votos presentes.");
  }

  const totalAssociates = roll.voters.length;
  const presentAssociates = roll.presentPersonIds.size;
  const result = evaluateVote({
    matter: assembly.matter as VotingMatter,
    convocation: assembly.convocation as Convocation,
    totalAssociates,
    presentAssociates,
    presentVotes,
    votesInFavor: inFavor,
  });

  const { error } = await supabase.from("assembly_results").upsert(
    {
      assembly_id: assemblyId,
      condominium_id: context.id,
      present_associates: presentAssociates,
      present_votes: presentVotes,
      votes_in_favor: inFavor,
      votes_against: against,
      votes_abstain: abstain,
      quorum_met: result.quorumMet,
      approved: result.approved,
      recorded_at: new Date().toISOString(),
    },
    { onConflict: "assembly_id" },
  );
  if (error) failDetail(assemblyId, friendlyDatabaseError(error.message));

  revalidatePath(`${BASE}/${assemblyId}`);
  redirect(`${BASE}/${assemblyId}?results=1`);
}

/** Salva a ata: rascunho, publicação ou correção de ata já publicada (a administração pode corrigir depois). */
export async function saveMinutesAction(form: FormData) {
  const { supabase, user, context } = await requireCondominiumPermission("assemblies.manage");
  const assemblyId = value(form, "assembly_id");
  const body = String(form.get("body") ?? "").trim();
  const publish = value(form, "intent") === "publish";

  if (body.length > 10000) failDetail(assemblyId, "A ata tem no máximo 10.000 caracteres.");

  const { data: assembly } = await supabase
    .from("assemblies")
    .select("id")
    .eq("id", assemblyId)
    .eq("condominium_id", context.id)
    .maybeSingle();
  if (!assembly) redirect(`${BASE}?error=${encodeURIComponent("Assembleia não encontrada.")}`);

  const { data: existing } = await supabase
    .from("assembly_minutes")
    .select("status,published_at")
    .eq("assembly_id", assemblyId)
    .maybeSingle();
  const { data: account } = await supabase.from("user_accounts").select("id").eq("auth_user_id", user.id).maybeSingle();

  // Ata já publicada continua publicada ao ser corrigida; publicar não trava a edição.
  const isPublished = existing?.status === "published" || publish;
  const { error } = await supabase.from("assembly_minutes").upsert(
    {
      assembly_id: assemblyId,
      condominium_id: context.id,
      body,
      status: isPublished ? "published" : "draft",
      published_at: isPublished ? existing?.published_at ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      updated_by: account?.id ?? null,
    },
    { onConflict: "assembly_id" },
  );
  if (error) failDetail(assemblyId, friendlyDatabaseError(error.message));

  revalidatePath(`${BASE}/${assemblyId}`);
  redirect(`${BASE}/${assemblyId}?minutes=${isPublished ? "published" : "draft"}`);
}

async function condominiumTimezone(supabase: SupabaseClient, condominiumId: string) {
  const { data } = await supabase.from("condominiums").select("timezone").eq("id", condominiumId).maybeSingle();
  return data?.timezone || "America/Sao_Paulo";
}
