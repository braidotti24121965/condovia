import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { Alert, EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Pessoas" };
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; saved?: string; error?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("people.read");
  const params = await searchParams; const page = Math.max(1, Number(params.page) || 1); const q = (params.q || "").trim();
  const [{ data: links, error }, {data:canManage}] = await Promise.all([
    supabase.from("person_condominium_links").select("person_id").eq("condominium_id", context.id).eq("status", "active"),
    supabase.rpc("has_permission",{permission_code:"people.manage",target_condominium_id:context.id}),
  ]);
  const ids = (links || []).map((link) => link.person_id);
  const query = supabase.from("people").select("id,full_name,preferred_name,status,birth_date,created_at", { count: "exact" }).in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("full_name").range((page-1)*25,page*25-1);
  if (q) query.ilike("full_name", `%${q.replace(/[%_]/g, "\\$&")}%`);
  if (["active","inactive","anonymized","suspended","archived"].includes(params.status || "")) query.eq("status", params.status!);
  const { data: people, count, error: peopleError } = await query;
  const personIds = (people || []).map((person) => person.id);
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
    {error || peopleError ? <Alert tone="error">Não foi possível carregar as pessoas agora.</Alert> : <section className="cv-panel">
      <form className="cv-filters" action="/app/condominium/people"><label className="cv-search"><Search size={17}/><input name="q" defaultValue={q} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome dentro deste condomínio"/></label><label>Situação<select name="status" defaultValue={params.status || ""}><option value="">Todas</option><option value="active">Ativa</option><option value="inactive">Inativa</option><option value="anonymized">Anonimizada</option><option value="suspended">Suspensa</option><option value="archived">Arquivada</option></select></label><Button variant="secondary" type="submit">Buscar</Button></form>
      {!people?.length ? <EmptyState title={q ? "Nenhuma pessoa encontrada" : "Nenhuma pessoa cadastrada"} description={q ? "Revise a busca ou os filtros." : "Cadastre uma pessoa para iniciar o histórico do condomínio."}/> : <>
        <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Nome</th><th>Documento</th><th>Contato</th><th>Situação</th><th></th></tr></thead><tbody>{people.map((person)=>{const doc=docByPerson.get(person.id);const cpf=doc?.document_type==="cpf"?doc.normalized_number:null;return <tr key={person.id}><td><Link href={`/app/condominium/people/${person.id}`}><strong>{person.preferred_name||person.full_name}</strong><small>{person.preferred_name?person.full_name:"Identidade do condomínio"}</small></Link></td><td>{cpf?`•••.•••.${cpf.slice(6,9)}-${cpf.slice(-2)}`:"Não informado"}</td><td>{emailByPerson.get(person.id)||"Não informado"}</td><td><StatusBadge variant={person.status === "active" ? "success" : person.status === "suspended" ? "warning" : "neutral"}>{statusLabel[person.status]||person.status}</StatusBadge></td><td><Link className="button button-secondary button-compact" href={`/app/condominium/people/${person.id}`}>Abrir dossiê</Link></td></tr>})}</tbody></table></div>
        <div className="cv-person-cards">{people.map((person)=>{const doc=docByPerson.get(person.id);const cpf=doc?.document_type==="cpf"?doc.normalized_number:null;return <Link className="cv-person-card" key={person.id} href={`/app/condominium/people/${person.id}`}><span><strong>{person.preferred_name||person.full_name}</strong><StatusBadge variant={person.status === "active" ? "success" : person.status === "suspended" ? "warning" : "neutral"}>{statusLabel[person.status]||person.status}</StatusBadge></span><small>{cpf?`CPF •••.•••.${cpf.slice(6,9)}-${cpf.slice(-2)}`:"Documento não informado"}</small><small>{emailByPerson.get(person.id)||"Contato não informado"}</small></Link>})}</div>
        <div className="cv-pagination"><span>{count??0} pessoas vinculadas</span><div>{page>1&&<Link className="button button-secondary button-compact" href={`?page=${page-1}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(params.status||"")}`}>Anterior</Link>}{page*25<(count||0)&&<Link className="button button-secondary button-compact" href={`?page=${page+1}&q=${encodeURIComponent(q)}&status=${encodeURIComponent(params.status||"")}`}>Próxima</Link>}</div></div>
      </>}
    </section>}
  </div>;
}
