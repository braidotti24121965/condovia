import type { SupabaseClient } from "@supabase/supabase-js";
import { votingUnitsByPerson, type Ownership, type Voter } from "@/lib/voting/voters";

export type VotingRoll = {
  /** Lotes em dia registrados para a assembleia. */
  eligibleUnitIds: Set<string>;
  /** Associados com direito a voto, considerando só os lotes em dia. */
  voters: (Voter & { name: string })[];
  /** Associados presentes que também estão na lista de votantes. */
  presentPersonIds: Set<string>;
};

/**
 * Monta a lista de votantes da assembleia: titulares de lotes em dia, com um voto por lote.
 * `today` é a data civil (aaaa-mm-dd) no fuso do condomínio.
 */
export async function loadVotingRoll(supabase: SupabaseClient, condominiumId: string, assemblyId: string, today: string): Promise<VotingRoll> {
  const [{ data: eligibleRows }, { data: ownershipRows }, { data: attendanceRows }] = await Promise.all([
    supabase.from("assembly_eligible_units").select("unit_id").eq("assembly_id", assemblyId),
    supabase
      .from("unit_ownerships")
      .select("person_id,unit_id,ownership_percentage")
      .eq("condominium_id", condominiumId)
      .lte("starts_at", today)
      .or(`ends_at.is.null,ends_at.gt.${today}`),
    supabase.from("assembly_attendance").select("person_id").eq("assembly_id", assemblyId),
  ]);

  const eligibleUnitIds = new Set((eligibleRows ?? []).map((row) => row.unit_id as string));
  const ownerships: Ownership[] = (ownershipRows ?? [])
    .filter((row) => eligibleUnitIds.has(row.unit_id as string))
    .map((row) => ({
      personId: row.person_id as string,
      unitId: row.unit_id as string,
      percentage: Number(row.ownership_percentage ?? 0),
    }));

  const voters = votingUnitsByPerson(ownerships);
  const personIds = voters.map((voter) => voter.personId);
  const { data: people } = personIds.length
    ? await supabase.from("people").select("id,full_name").in("id", personIds)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((people ?? []).map((person) => [person.id, person.full_name]));

  const votersWithNames = voters
    .map((voter) => ({ ...voter, name: names.get(voter.personId) ?? "Associado" }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const voterIds = new Set(personIds);
  const presentPersonIds = new Set(
    (attendanceRows ?? []).map((row) => row.person_id as string).filter((personId) => voterIds.has(personId)),
  );

  return { eligibleUnitIds, voters: votersWithNames, presentPersonIds };
}
