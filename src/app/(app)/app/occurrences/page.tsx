import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { createOccurrenceAction, transitionOccurrenceAction } from "@/lib/occurrences/actions";

export const metadata = { title: "Ocorrências" };

export default async function OccurrencesPage() {
  const { supabase } = await requireUser();
  const context = await requireCurrentContext();
  if (!supabase || context.type !== "condominium") return <section className="no-permission"><h1>Sem acesso</h1></section>;
  const [{ data: categories }, { data: occurrences }, { data: units }] = await Promise.all([
    supabase.from("occurrence_categories").select("id,name,default_priority").eq("condominium_id", context.id).eq("is_active", true).order("sort_order"),
    supabase.from("occurrences").select("id,occurrence_number,title,description,priority,status,origin,confidential,created_at,requester_person_id,category:occurrence_categories(name)").eq("condominium_id", context.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("units").select("id,code,display_name").eq("condominium_id", context.id).eq("operational_status", "active").order("code"),
  ]);
  return <div className="cv-page"><div className="page-heading"><div><p className="page-overline">GESTÃO OPERACIONAL</p><h1>Ocorrências</h1><p>Registre e acompanhe solicitações do condomínio.</p></div></div>
    <section className="cv-panel"><h2>Nova ocorrência</h2><form action={createOccurrenceAction} className="cv-form-grid"><label>Categoria<select name="category_id" required><option value="">Selecione</option>{(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Título<input name="title" required minLength={3} /></label><label className="full">Descrição<textarea name="description" required minLength={3} /></label><label>Prioridade<select name="priority" defaultValue=""><option value="">Padrão da categoria</option><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label><label>Unidade relacionada<select name="related_unit_id" defaultValue=""><option value="">Opcional</option>{(units || []).map((u) => <option key={u.id} value={u.id}>{u.code}{u.display_name ? ` — ${u.display_name}` : ""}</option>)}</select></label><label className="checkbox-field"><input type="checkbox" name="confidential" /> Relato confidencial</label><input type="hidden" name="origin" value="resident" /><button className="button button-primary" type="submit">Abrir ocorrência</button></form></section>
    <section className="cv-panel"><h2>Ocorrências recentes</h2>{occurrences?.length ? <div className="cv-table-wrap"><table><thead><tr><th>Número</th><th>Título</th><th>Status</th><th>Prioridade</th><th>Ações</th></tr></thead><tbody>{occurrences.map((o) => <tr key={o.id}><td>#{o.occurrence_number}</td><td><strong>{o.title}</strong><small>{(o.category as { name?: string } | null)?.name || ""}</small></td><td>{o.status}</td><td>{o.priority}</td><td>{o.status === "open" && <form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={o.id}/><input type="hidden" name="action" value="triage"/><button className="button button-outline" type="submit">Triar</button></form>}{o.status === "resolved" && <form action={transitionOccurrenceAction}><input type="hidden" name="occurrence_id" value={o.id}/><input type="hidden" name="action" value="close"/><button className="button button-outline" type="submit">Encerrar</button></form>}</td></tr>)}</tbody></table></div> : <p className="cv-empty">Nenhuma ocorrência registrada.</p>}</section>
  </div>;
}
