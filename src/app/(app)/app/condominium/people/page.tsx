import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import Link from "next/link";
import { ChevronRight, Plus, Search, Users, UserCheck } from "lucide-react";
import { hasPermission, requireCondominiumPermission } from "@/lib/condominium/access";
import { Alert, EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Pessoas" };
type PersonRow = { id: string; full_name: string; preferred_name: string | null; status: string; birth_date: string | null; created_at: string; total_count: number };
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; cpf?: string; status?: string; page?: string; saved?: string; error?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("people.read");
  const params = await searchParams; const page = Math.max(1, Number(params.page) || 1); const q = (params.q || "").trim(); const cpf = (params.cpf || "").trim(); const hasFilter = Boolean(q || cpf || params.status);
  const [{ data: canManage }, { data: peopleData, error: peopleError }, { count: activeCount }] = await Promise.all([
    hasPermission("people.manage", context.id),
    hasFilter ? supabase.rpc("list_people_for_condominium", {
      p_condominium_id: context.id,
      p_limit: 50,
      p_offset: (page - 1) * 50,
      p_query: q || null,
      p_cpf: cpf || null,
      p_status: ["active","inactive","anonymized","suspended","archived"].includes(params.status || "") ? params.status : null,
    }) : Promise.resolve({data: [], error: null}),
    supabase.from("people").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const visiblePeople = (peopleData || []) as PersonRow[];
  const visibleCount = visiblePeople[0]?.total_count || 0;
  const loadError = peopleError;
  const personIds = visiblePeople.map((person) => person.id);
  const [{ data: docs }, { data: emails }] = personIds.length ? await Promise.all([
    supabase.from("person_documents").select("person_id,normalized_number,document_type").in("person_id", personIds),
    supabase.from("person_emails").select("person_id,email,is_primary").in("person_id", personIds).order("is_primary", { ascending: false }),
  ]) : [{ data: [] }, { data: [] }];
  const docByPerson = new Map((docs || []).map((doc) => [doc.person_id, doc])); const emailByPerson = new Map<string,string>();
  for (const email of emails || []) if (!emailByPerson.has(email.person_id)) emailByPerson.set(email.person_id, email.email);
  const statusLabel: Record<string,string> = {active:"Ativa",inactive:"Inativa",anonymized:"Anonimizada",suspended:"Suspensa",archived:"Arquivada"};
  return <div className="cv-page">
    <div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><strong>Pessoas</strong></div>
    <section className="page-heading"><div><p className="page-overline">CONDOMÍNIO</p><h1>Pessoas</h1><p>Identidades conhecidas e gerenciadas por {context.name}.</p></div>{canManage===true&&<Link className="button button-primary" href="/app/condominium/people/new"><Plus size={17}/> Nova pessoa</Link>}</section>
    {params.saved && <Alert tone="success">Pessoa cadastrada.</Alert>}{params.error && <Alert tone="error">{params.error}</Alert>}
    <section className="v2-kpi-grid v2-resident-kpis"><article className="v2-kpi v2-kpi-residents"><span className="v2-kpi-icon"><Users size={17}/></span><div><small>Pessoas cadastradas</small><strong>{visibleCount}</strong><em>Registros vinculados ao condomínio</em></div></article><article className="v2-kpi v2-kpi-units"><span className="v2-kpi-icon"><UserCheck size={17}/></span><div><small>Pessoas ativas</small><strong>{activeCount??0}</strong><em>Cadastros ativos</em></div></article></section>
    {loadError ? <Alert tone="error">Não foi possível carregar as pessoas agora.</Alert> : <section className="cv-panel">
      <form className="cv-filters" action="/app/condominium/people"><label className="cv-search"><Search size={17}/><input name="q" defaultValue={q} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome dentro deste condomínio"/></label><label>CPF<input name="cpf" defaultValue={cpf} placeholder="Digite o CPF" inputMode="numeric"/></label><label>Situação<select name="status" defaultValue={params.status || ""}><option value="">Todas</option><option value="active">Ativa</option><option value="inactive">Inativa</option><option value="anonymized">Anonimizada</option><option value="suspended">Suspensa</option><option value="archived">Arquivada</option></select></label><SubmitButton variant="secondary" type="submit">Buscar</SubmitButton></form>
      {!visiblePeople.length ? <EmptyState title={q ? "Nenhuma pessoa encontrada" : "Nenhuma pessoa cadastrada"} description={q ? "Revise a busca ou os filtros." : "Cadastre uma pessoa para iniciar o histórico do condomínio."}/> : <>
        <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Nome</th><th>Documento</th><th>Contato</th><th>Situação</th><th></th></tr></thead><tbody>{visiblePeople.map((person)=>{const doc=docByPerson.get(person.id);const cpf=doc?.document_type==="cpf"?doc.normalized_number:null;return <tr key={person.id}><td><Link href={`/app/condominium/people/${person.id}`}><strong>{person.preferred_name||person.full_name}</strong><small>{person.preferred_name?person.full_name:"Identidade do condomínio"}</small></Link></td><td>{cpf?`•••.•••.${cpf.slice(6,9)}-${cpf.slice(-2)}`:"Não informado"}</td><td>{emailByPerson.get(person.id)||"Não informado"}</td><td><StatusBadge variant={person.status === "active" ? "success" : person.status === "suspended" ? "warning" : "neutral"}>{statusLabel[person.status]||person.status}</StatusBadge></td><td><Link className="button button-secondary button-compact" href={`/app/condominium/people/${person.id}`}>Abrir dossiê</Link></td></tr>})}</tbody></table></div>
        <div className="cv-person-cards">{visiblePeople.map((person)=>{const doc=docByPerson.get(person.id);const cpf=doc?.document_type==="cpf"?doc.normalized_number:null;return <Link className="cv-person-card" key={person.id} href={`/app/condominium/people/${person.id}`}><span><strong>{person.preferred_name||person.full_name}</strong><StatusBadge variant={person.status === "active" ? "success" : person.status === "suspended" ? "warning" : "neutral"}>{statusLabel[person.status]||person.status}</StatusBadge></span><small>{cpf?`CPF •••.•••.${cpf.slice(6,9)}-${cpf.slice(-2)}`:"Documento não informado"}</small><small>{emailByPerson.get(person.id)||"Contato não informado"}</small></Link>})}</div>
        <div className="cv-pagination"><span>{visibleCount??0} pessoas vinculadas · página {page} de {Math.max(1,Math.ceil((visibleCount||0)/50))}</span><div>{page>1&&<Link className="button button-secondary button-compact" href={`?page=${page-1}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(params.status||"")}`}>Anterior</Link>}{page*50<(visibleCount||0)&&<Link className="button button-secondary button-compact" href={`?page=${page+1}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(params.status||"")}`}>Próxima</Link>}</div></div>
      </>}
    </section>}
  </div>;
}
