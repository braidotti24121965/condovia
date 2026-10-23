import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { EligibleUnitsForm } from "@/components/voting/eligible-units-form";
import { hasPermission, requireCondominiumPermission } from "@/lib/condominium/access";
import { todayInTimezone } from "@/lib/condominium/people-data";
import { loadVotingRoll } from "@/lib/voting/assembly-data";
import { saveAttendanceAction, saveResultsAction } from "@/lib/voting/actions";
import { assemblyConvocationLabels, assemblyMatterLabels } from "@/lib/voting/labels";
import { evaluateVote, type Convocation, type VotingMatter } from "@/lib/voting/quorum";

export const metadata = { title: "Assembleia" };

export default async function AssemblyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, context } = await requireCondominiumPermission("assemblies.read");
  const { id } = await params;
  const query = await searchParams;

  const { data: assembly } = await supabase
    .from("assemblies")
    .select("id,title,matter,convocation,held_at")
    .eq("id", id)
    .eq("condominium_id", context.id)
    .maybeSingle();
  if (!assembly) notFound();

  const { data: condominium } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  const today = todayInTimezone(condominium?.timezone || "America/Sao_Paulo");
  const [roll, { data: canManage }, { data: result }] = await Promise.all([
    loadVotingRoll(supabase, context.id, id, today),
    hasPermission("assemblies.manage", context.id),
    supabase.from("assembly_results").select("present_associates,present_votes,votes_in_favor,votes_against,votes_abstain").eq("assembly_id", id).maybeSingle(),
  ]);
  const editable = canManage === true;
  const matter = assembly.matter as VotingMatter;
  const convocation = assembly.convocation as Convocation;

  const outcome = result
    ? evaluateVote({
        matter,
        convocation,
        totalAssociates: roll.voters.length,
        presentAssociates: result.present_associates,
        presentVotes: result.present_votes,
        votesInFavor: result.votes_in_favor,
      })
    : null;

  return <div className="cv-page">
    <div className="breadcrumbs"><Link href="/app/condominium/assemblies">Assembleias</Link><span aria-hidden="true">›</span><strong>{assembly.title}</strong></div>
    {query.error && <Alert tone="error">{query.error}</Alert>}
    {query.created && <Alert tone="success">Assembleia criada.</Alert>}
    {query.eligible && <Alert tone="success">{`${query.eligible} lotes em dia salvos.`}{query.notFound && Number(query.notFound) > 0 ? ` ${query.notFound} código(s) não encontrado(s) no condomínio.` : ""}{query.invalid && Number(query.invalid) > 0 ? ` ${query.invalid} linha(s) com código inválido foram ignoradas.` : ""}</Alert>}
    {query.attendance && <Alert tone="success">Presença salva.</Alert>}
    {query.results && <Alert tone="success">Totais salvos.</Alert>}

    <section className="cv-form-section">
      <h1>{assembly.title}</h1>
      <p className="cv-form-hint">{assemblyMatterLabels[matter]} · {assemblyConvocationLabels[convocation]}</p>
    </section>

    <section className="cv-form-section">
      <h2>1. Lotes em dia</h2>
      <p>{roll.eligibleUnitIds.size} lotes em dia registrados para esta assembleia.</p>
      {editable && <EligibleUnitsForm assemblyId={id} />}
    </section>

    <section className="cv-form-section">
      <h2>2. Presença</h2>
      {roll.voters.length === 0
        ? <Alert tone="info">Nenhum associado com direito a voto nos lotes em dia.</Alert>
        : <form action={saveAttendanceAction} className="cv-form">
          <input type="hidden" name="assembly_id" value={id} />
          <ul className="cv-check-list">
            {roll.voters.map((voter) => <li key={voter.personId}>
              <label>
                <input type="checkbox" name="person_id" value={voter.personId} defaultChecked={roll.presentPersonIds.has(voter.personId)} disabled={!editable} />
                <span>{voter.name}</span>
                <span className="cv-form-hint">{voter.unitIds.length === 1 ? "1 lote" : `${voter.unitIds.length} lotes`}</span>
              </label>
            </li>)}
          </ul>
          {editable && <div className="cv-form-actions"><Button type="submit" variant="primary" size="compact">Salvar presença</Button></div>}
        </form>}
    </section>

    <section className="cv-form-section">
      <h2>3. Totais da votação</h2>
      {roll.eligibleUnitIds.size === 0
        ? <Alert tone="warning">Importe a lista de lotes em dia antes de lançar os totais.</Alert>
        : <>
          <p>Associados com direito a voto: {roll.voters.length}. Presentes: {roll.presentPersonIds.size}.</p>
          {outcome && <Alert tone={outcome.quorumMet && outcome.approved ? "success" : "warning"}>
            {`Quórum ${outcome.quorumMet ? "atendido" : "não atendido"}. Aprovação ${outcome.approved ? "obtida" : "não obtida"}. ${outcome.reason}`}
          </Alert>}
          <form action={saveResultsAction} className="cv-form">
            <input type="hidden" name="assembly_id" value={id} />
            <div className="cv-form-grid">
              <label className="cv-field-sm">Votos presentes<input name="present_votes" type="number" inputMode="numeric" min="0" step="1" required defaultValue={result?.present_votes} disabled={!editable} /></label>
              <label className="cv-field-sm">Favoráveis<input name="votes_in_favor" type="number" inputMode="numeric" min="0" step="1" required defaultValue={result?.votes_in_favor} disabled={!editable} /></label>
              <label className="cv-field-sm">Contrários<input name="votes_against" type="number" inputMode="numeric" min="0" step="1" required defaultValue={result?.votes_against} disabled={!editable} /></label>
              <label className="cv-field-sm">Abstenções<input name="votes_abstain" type="number" inputMode="numeric" min="0" step="1" required defaultValue={result?.votes_abstain} disabled={!editable} /></label>
              {editable && <div className="cv-form-actions"><Button type="submit" variant="primary" size="compact">Salvar totais</Button></div>}
            </div>
          </form>
        </>}
    </section>
  </div>;
}
