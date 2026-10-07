import { notFound } from "next/navigation";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { addOccurrenceCommentAction, transitionOccurrenceAction } from "@/lib/occurrences/actions";
import { Button } from "@/components/ui/button";

type AssigneeRow = { user_account_id: string; user_accounts?: { people?: { full_name?: string; preferred_name?: string } | null } | null };

export default async function OccurrenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase }, context] = await Promise.all([params, requireUser(), requireCurrentContext()]);
  if (!supabase || context.type !== "condominium") return notFound();
  const [{ data: occurrence }, { data: assigneeRows }] = await Promise.all([
    supabase.from("occurrences").select("*, category:occurrence_categories(name), comments:occurrence_comments(id,body,visibility,created_at,author_user_account_id), history:occurrence_history(id,event_type,previous_status,new_status,reason,created_at)").eq("id", id).eq("condominium_id", context.id).single(),
    supabase.from("role_assignments").select("user_account_id,user_accounts(id,people(full_name,preferred_name)),roles!inner(code)").eq("condominium_id", context.id).eq("status", "active").in("roles.code", ["condominium.syndic", "condominium.manager"]),
  ]);
  if (!occurrence) return notFound();
  const comments = [...(occurrence.comments || [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const history = [...(occurrence.history || [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const assignees = (assigneeRows || []) as AssigneeRow[];
  return <div className="cv-page"><div className="page-heading"><div><p className="page-overline">OCORRÊNCIA #{occurrence.occurrence_number}</p><h1>{occurrence.title}</h1><p>{occurrence.category?.name} · {occurrence.status} · {occurrence.priority}</p></div></div>
    <section className="cv-panel"><h2>Detalhes</h2><p>{occurrence.description}</p><dl><dt>Origem</dt><dd>{occurrence.origin}</dd><dt>Confidencialidade</dt><dd>{occurrence.confidential ? "Confidencial" : "Condomínio"}</dd><dt>Aberta em</dt><dd>{new Date(occurrence.created_at).toLocaleString("pt-BR")}</dd>{occurrence.resolution && <><dt>Resolução</dt><dd>{occurrence.resolution}</dd></>}</dl></section>
    <section className="cv-panel"><h2>Ações</h2><div className="cv-actions">
      {occurrence.status === "open" && <form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={id}/><input type="hidden" name="action" value="triage"/><Button variant="secondary" type="submit">Iniciar triagem</Button></form>}
      {occurrence.status === "triage" && <form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={id}/><input type="hidden" name="action" value="assign"/><select name="assignee_user_account_id" required><option value="">Selecione o responsável</option>{assignees.map((row) => <option key={row.user_account_id} value={row.user_account_id}>{row.user_accounts?.people?.preferred_name || row.user_accounts?.people?.full_name || row.user_account_id}</option>)}</select><Button variant="secondary" type="submit">Atribuir</Button></form>}
      {occurrence.status === "in_progress" && <form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={id}/><input type="hidden" name="action" value="resolve"/><input name="reason" required placeholder="Descreva a resolução"/><Button type="submit">Resolver</Button></form>}
      {occurrence.status === "resolved" && <><form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={id}/><input type="hidden" name="action" value="close"/><Button type="submit">Encerrar</Button></form><form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={id}/><input type="hidden" name="action" value="reopen"/><input name="reason" required placeholder="Motivo da reabertura"/><Button variant="secondary" type="submit">Reabrir</Button></form></>}
      {["open", "triage", "in_progress"].includes(occurrence.status) && <form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={id}/><input type="hidden" name="action" value="cancel"/><input name="reason" required placeholder="Motivo do cancelamento"/><Button variant="destructive" type="submit">Cancelar</Button></form>}
    </div></section>
    <section className="cv-panel"><h2>Comentários</h2>{comments.map((comment) => <article key={comment.id}><strong>{comment.visibility === "internal" ? "Interno" : "Solicitante"}</strong><p>{comment.body}</p></article>)}<form action={addOccurrenceCommentAction} className="cv-form-grid"><input type="hidden" name="occurrence_id" value={id}/><textarea name="body" required minLength={1} placeholder="Adicionar comentário"/><label>Visibilidade<select name="visibility" defaultValue="requester"><option value="requester">Solicitante</option><option value="internal">Interno</option></select></label><Button type="submit">Comentar</Button></form></section>
    <section className="cv-panel"><h2>Histórico</h2><ol>{history.map((event) => <li key={event.id}><strong>{event.event_type}</strong> — {event.previous_status || ""} → {event.new_status || ""}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol></section>
  </div>;
}
