import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, House, KeyRound, Pencil } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { Alert } from "@/components/ui/feedback";
import { PersonContactForms, PersonCpfForm, PersonEditForm, ResidentInviteForm } from "@/components/condominium/person-form";
import { endPersonRelationship } from "@/lib/condominium/actions";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";

export const metadata = { title: "Dossiê da pessoa" };
type Relation = { id:string; unit_id:string; starts_at:string; ends_at:string|null; ownership_percentage?:number|null; occupancy_type?:string; is_primary?:boolean; units:{code:string;display_name:string|null}|null };
export default async function PersonDossier({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<{saved?:string;error?:string}> }) {
  const { id }=await params; const { supabase,context }=await requireCondominiumPermission("people.read"); const query=await searchParams;
  const [{data:person},{data:link},{data:docs},{data:emails},{data:phones},{data:canManage},{data:canInvite},{data:canReadOwners},{data:canManageOwners},{data:canReadResidents},{data:canManageResidents},{data:canReadFinance},{data:canManageFinance},summaryResult] = await Promise.all([
    supabase.from("people").select("id,full_name,preferred_name,birth_date,status,created_at").eq("id",id).maybeSingle(),
    supabase.from("person_condominium_links").select("id,status,created_at").eq("person_id",id).eq("condominium_id",context.id).maybeSingle(),
    supabase.from("person_documents").select("id,document_type,normalized_number,is_primary,created_at").eq("person_id",id).order("created_at"),
    supabase.from("person_emails").select("id,email,is_primary,is_verified").eq("person_id",id),
    supabase.from("person_phones").select("id,phone_e164,phone_type,is_primary,is_verified,is_whatsapp").eq("person_id",id),
    supabase.rpc("has_permission",{permission_code:"people.manage",target_condominium_id:context.id}),
    supabase.rpc("has_permission",{permission_code:"users.invite",target_condominium_id:context.id}),
    supabase.rpc("has_permission",{permission_code:"ownerships.read",target_condominium_id:context.id}),
    supabase.rpc("has_permission",{permission_code:"ownerships.manage",target_condominium_id:context.id}),
    supabase.rpc("has_permission",{permission_code:"residents.read",target_condominium_id:context.id}),
    supabase.rpc("has_permission",{permission_code:"residents.manage",target_condominium_id:context.id}),
    supabase.rpc("has_permission",{permission_code:"financial_responsibilities.read",target_condominium_id:context.id}),
    supabase.rpc("has_permission",{permission_code:"financial_responsibilities.manage",target_condominium_id:context.id}),
    supabase.rpc("get_person_resident_access_summary",{p_person_id:id,p_condominium_id:context.id}),
  ]);
  if(!person||!link) notFound();
  const { data: condo } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  const timeZone = condo?.timezone || "UTC";
  const [{data:owners},{data:occupancies},{data:finance},{data:audit}] = await Promise.all([
    canReadOwners?supabase.from("unit_ownerships").select("id,unit_id,starts_at,ends_at,ownership_percentage,units(code,display_name)").eq("person_id",id).eq("condominium_id",context.id).order("starts_at",{ascending:false}):Promise.resolve({data:[]}),
    canReadResidents?supabase.from("unit_occupancies").select("id,unit_id,starts_at,ends_at,occupancy_type,is_primary,units(code,display_name)").eq("person_id",id).eq("condominium_id",context.id).order("starts_at",{ascending:false}):Promise.resolve({data:[]}),
    canReadFinance?supabase.from("unit_financial_responsibilities").select("id,unit_id,starts_at,ends_at,units(code,display_name)").eq("person_id",id).eq("condominium_id",context.id).order("starts_at",{ascending:false}):Promise.resolve({data:[]}),
    supabase.from("audit_events").select("id,event_type,entity_type,created_at,metadata").in("entity_id",[id,link.id,...(docs||[]).map((d)=>d.id),...(emails||[]).map((e)=>e.id),...(phones||[]).map((p)=>p.id)]).contains("metadata",{condominium_id:context.id}).order("created_at",{ascending:false}).limit(20),
  ]);
  const cpf=docs?.find((d)=>d.document_type==="cpf"&&d.is_primary)?.normalized_number||null;
  const masked=cpf?`•••.•••.${cpf.slice(6,9)}-${cpf.slice(-2)}`:"Não informado";
  const labelStatus:Record<string,string>={active:"Ativa",inactive:"Inativa",anonymized:"Anonimizada",suspended:"Suspensa",archived:"Arquivada"};
  const access=summaryResult.data as {account_status:string;active_membership:boolean;eligible_relationship:boolean;pending_invitation:boolean;access_without_eligible_relationship:boolean}|null;
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><Link href="/app/condominium/people">Pessoas</Link><ChevronRight size={14}/><strong>{person.preferred_name||person.full_name}</strong></div>
    {query.saved&&<Alert tone="success">{query.saved==="invitation"?"Se o endereço puder receber acesso, as instruções foram enviadas.":query.saved==="contact"?"Contato salvo.":"Alterações salvas."}</Alert>}{query.error&&<Alert tone="error">{query.error}</Alert>}
    <section className="page-heading"><div><p className="page-overline">DOSSIÊ DA PESSOA</p><h1>{person.preferred_name||person.full_name}</h1><p>{person.full_name}</p></div><span className={`cv-status cv-status-${person.status}`}>{labelStatus[person.status]||person.status}</span></section>
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2><Pencil size={18}/> Dados pessoais</h2><p>Documento e contatos visíveis somente neste contexto autorizado.</p></div></div><div className="cv-read-grid"><p><span>CPF</span><strong>{masked}</strong></p><p><span>Nascimento</span><strong>{person.birth_date?new Intl.DateTimeFormat("pt-BR",{dateStyle:"long",timeZone:"UTC"}).format(new Date(`${person.birth_date}T00:00:00Z`)):"Não informado"}</strong></p><p><span>E-mails</span><strong>{emails?.map((e)=>e.email).join(", ")||"Não informado"}</strong></p><p><span>Telefones</span><strong>{phones?.map((p)=>p.phone_e164).join(", ")||"Não informado"}</strong></p><p><span>Cadastro</span><strong>{formatDateTimeInTimezone(person.created_at, timeZone)}</strong></p></div></section>
    {canManage&&<><section className="cv-panel"><div className="cv-panel-heading"><div><h2>Editar dados</h2><p>Esta edição não altera relacionamentos nem histórico de acesso.</p></div></div><PersonEditForm person={person}/></section><section className="cv-panel"><h2>Documento CPF</h2><p>O documento completo é omitido do dossiê; alterações ficam registradas.</p><PersonCpfForm personId={id} currentCpf={cpf}/></section></>}
    <PersonContactForms personId={id} emails={emails||[]} phones={phones||[]} canManage={canManage===true}/>
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2>Acesso CondoVia</h2><p>Conta, membership e elegibilidade para acesso de residente.</p></div></div>{access?<div className="cv-read-grid"><p><span>Conta</span><strong>{access.account_status==="active"?"Ativa":access.account_status==="suspended"?"Suspensa":access.account_status==="none"?"Sem conta":"Convite pendente"}</strong></p><p><span>Membership no condomínio</span><strong>{access.active_membership?"Ativa":"Sem membership vigente"}</strong></p><p><span>Vínculo elegível</span><strong>{access.eligible_relationship?"Ownership ou moradia vigente/futura":"Nenhum vínculo elegível"}</strong></p><p><span>Convite</span><strong>{access.pending_invitation?"Pendente":"Nenhum convite pendente"}</strong></p>{access.access_without_eligible_relationship&&<p className="cv-read-wide"><span>Atenção</span><strong>Acesso de residente sem vínculo elegível. A membership foi preservada.</strong></p>}</div>:<Alert tone="error">Não foi possível consultar o estado de acesso.</Alert>}</section>
    {access&&<ResidentInviteForm personId={id} emails={emails||[]} canInvite={canInvite===true&&person.status==="active"&&access.eligible_relationship}/ >}
    {canReadOwners&&<section className="cv-panel"><h2><KeyRound size={18}/> Propriedades</h2><RelationshipRows kind="ownership" rows={(owners||[]) as unknown as Relation[]} personId={id} canManage={canManageOwners===true}/></section>}
    {canReadResidents&&<section className="cv-panel"><h2><House size={18}/> Moradias</h2><RelationshipRows kind="occupancy" rows={(occupancies||[]) as unknown as Relation[]} personId={id} canManage={canManageResidents===true}/></section>}
    {canReadFinance&&<section className="cv-panel"><h2>Responsabilidades financeiras</h2><RelationshipRows kind="financial" rows={(finance||[]) as unknown as Relation[]} personId={id} canManage={canManageFinance===true}/></section>}
    <section className="cv-panel"><h2>Histórico de alterações</h2>{audit?.length?<ul className="cv-history">{audit.map((event)=><li key={event.id}><strong>{event.event_type}</strong><span>{formatDateTimeInTimezone(event.created_at, timeZone)}</span></li>)}</ul>:<p className="cv-muted">Nenhuma alteração disponível neste contexto.</p>}</section>
  </div>;
}
function RelationshipRows({kind,rows,personId,canManage}:{kind:"ownership"|"occupancy"|"financial";rows:Relation[];personId:string;canManage:boolean}) {
  const labels:Record<string,string>={owner:"Proprietário",tenant:"Inquilino",family_member:"Familiar",dependent:"Dependente",other:"Outro"};
  if(!rows.length)return <p className="cv-muted">Nenhum vínculo registrado.</p>;
  return <div className="cv-person-relations">{rows.map((r)=><article key={r.id}><strong>{relationUnitValue(r)}</strong><span>{kind==="ownership"?r.ownership_percentage===null?"Participação não informada":`${r.ownership_percentage}%`:kind==="occupancy"?`${labels[r.occupancy_type||""]||"Morador"}${r.is_primary?" · Principal":""}`:"Responsável financeiro"}</span><small>{r.starts_at} → {r.ends_at||"sem término definido"}</small>{canManage&&!r.ends_at&&<form action={endPersonRelationship} className="cv-end-form"><input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={r.id}/><input type="hidden" name="person_id" value={personId}/><label>Encerrar com término em<input type="date" name="ends_at" required min={nextDate(r.starts_at)}/></label><button className="button button-outline button-small" type="submit">Encerrar</button><small>A data final é exclusiva.</small></form>}</article>)}</div>;
}
function relationUnitValue(r:Relation){return r.units?.display_name||r.units?.code||"Unidade";}
function nextDate(day:string){const d=new Date(`${day}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
