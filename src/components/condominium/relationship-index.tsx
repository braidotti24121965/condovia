import { EmptyState } from "@/components/ui/feedback";
import { PersonRelationshipForm } from "@/components/condominium/person-form";
import { occupancyTypeLabels } from "@/lib/condominium/format";
import Link from "next/link";
import { Plus, Users, Building2 } from "lucide-react";
import { RelationshipFilters } from "@/components/condominium/relationship-filters";

export type RelationshipRow={id:string;person_id:string;unit_id:string;starts_at:string;ends_at:string|null;ownership_percentage?:number|null;occupancy_type?:string;is_primary?:boolean;person_name:string;unit_code:string;unit_name:string|null;structure_id:string|null;structure_name:string};
export function RelationshipIndex({kind,rows,people,units,mode,today,canManage,returnTo,selectedPersonId,showForm=false,q="",structureId="",unitId="",occupancyType="",page=1}:{kind:"ownership"|"occupancy";rows:RelationshipRow[];people:{id:string;full_name:string}[];units:{id:string;code:string;display_name:string|null;structure_id:string|null;structure_name:string;operational_status:string}[];mode:string;today:string;canManage:boolean;returnTo:string;selectedPersonId?:string;showForm?:boolean;q?:string;structureId?:string;unitId?:string;occupancyType?:string;page?:number}) {
  const needle=q.trim().toLocaleLowerCase("pt-BR");
  const filtered=rows.filter((r)=>{
    const dateMatches=mode==="all"?true:mode==="current"?r.starts_at<=today&&(!r.ends_at||r.ends_at>today):mode==="future"?r.starts_at>today:!!r.ends_at&&r.ends_at<=today;
    const searchMatches=!needle||`${r.person_name} ${r.unit_name||""} ${r.unit_code} ${r.structure_name}`.toLocaleLowerCase("pt-BR").includes(needle);
    const quadra=((r.unit_name||r.unit_code).match(/\bquadra\s+([a-z]+)/i)?.[1]||"").toUpperCase();
    return dateMatches&&searchMatches&&(!structureId||r.structure_id===structureId)&&(!unitId||quadra===unitId)&&(kind!=="occupancy"||!occupancyType||r.occupancy_type===occupancyType);
  });
  const sortedFiltered=[...filtered].sort((a,b)=>a.person_name.localeCompare(b.person_name,"pt-BR",{sensitivity:"base"})||a.unit_code.localeCompare(b.unit_code,"pt-BR",{numeric:true,sensitivity:"base"}));
  const pageSize=50; const totalPages=Math.max(1,Math.ceil(sortedFiltered.length/pageSize)); const currentPage=Math.min(Math.max(page,1),totalPages); const visibleRows=sortedFiltered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const pageHref=(nextPage:number)=>{const params=new URLSearchParams(returnTo.split("?")[1]||"");params.set("page",String(nextPage));return `${returnTo.split("?")[0]}?${params.toString()}`;};
  const structures=[...new Map(units.filter((unit)=>unit.structure_id).map((unit)=>[unit.structure_id!,{id:unit.structure_id!,name:unit.structure_name}])).values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  const title=kind==="ownership"?"Proprietários":"Moradores";
  const relationshipLabel=kind==="ownership"?"proprietários":"moradores";
  const newLabel=kind==="ownership"?"Novo proprietário":"Novo morador";
  const currentLabel=kind==="ownership"?"Proprietários vigentes":"Moradores vigentes";
  const unitsLabel=kind==="ownership"?"Unidades com proprietários":"Unidades com moradores";
  const currentRows=rows.filter((r)=>r.starts_at<=today&&(!r.ends_at||r.ends_at>today));
  const occupiedUnits=new Set(currentRows.map((r)=>r.unit_id)).size;
  const formQuery=new URLSearchParams(returnTo.split("?")[1]||""); formQuery.set("new","1");
  const closeHref=returnTo;
  return <div className="cv-page">
    <section className="v2-page-header"><div><p className="page-overline">CONDOMÍNIO</p><h1>{title}</h1><p>Gerencie os {relationshipLabel} do condomínio.</p></div>{canManage&&<Link className="button button-primary" href={`?${formQuery.toString()}`}><Plus size={17}/> {newLabel}</Link>}</section>
    <section className="v2-kpi-grid v2-resident-kpis"><article className="v2-kpi v2-kpi-residents"><span className="v2-kpi-icon"><Users size={17}/></span><div><small>{currentLabel}</small><strong>{currentRows.length}</strong><em>Vínculos ativos hoje</em></div></article><article className="v2-kpi v2-kpi-units"><span className="v2-kpi-icon"><Building2 size={17}/></span><div><small>{unitsLabel}</small><strong>{occupiedUnits}</strong><em>Unidades com vínculo vigente</em></div></article></section>
    <section className="cv-panel v2-residents-panel"><RelationshipFilters q={q} structureId={structureId} unitId={unitId} occupancyType={occupancyType} mode={mode} structures={structures} units={units} occupancy={kind==="occupancy"}/>
      {!filtered.length?<EmptyState title="Nenhum vínculo neste filtro" description="Ajuste o filtro ou cadastre um vínculo abaixo."/>:<><div className="cv-table-wrap"><table className="cv-table v2-residents-table"><thead><tr><th>Pessoa</th><th>Unidade</th><th>{kind==="ownership"?"Participação":"Tipo"}</th><th>Vigência</th></tr></thead><tbody>{visibleRows.map((r)=><tr key={r.id}><td><Link className="v2-resident-person" href={`/app/condominium/people/${r.person_id}`}><span className="v2-resident-avatar" aria-hidden="true">{initials(r.person_name)}</span><strong>{r.person_name}</strong></Link></td><td><strong>{r.unit_name||r.unit_code}</strong><small>{r.structure_name}</small></td><td><span className="v2-resident-type">{kind==="ownership"?(r.ownership_percentage===null||r.ownership_percentage===undefined?"Participação não informada":formatOwnershipPercentage(r.ownership_percentage)):<>{occupancyTypeLabels[r.occupancy_type||""]||"Outro"}{r.is_primary&&<b>Principal</b>}</>}</span></td><td><span className="v2-resident-date">{r.starts_at} → {r.ends_at||"sem término"}</span></td></tr>)}</tbody></table></div><div className="cv-person-cards">{visibleRows.map((r)=><article className="cv-person-card" key={r.id}><Link href={`/app/condominium/people/${r.person_id}`}><strong>{r.person_name}</strong></Link><small>{r.unit_name||r.unit_code}</small><small>{kind==="ownership"?(r.ownership_percentage===null||r.ownership_percentage===undefined?"Participação não informada":formatOwnershipPercentage(r.ownership_percentage)):<>{occupancyTypeLabels[r.occupancy_type||""]||"Outro"}{r.is_primary&&" · Principal"}</>}</small><small>{r.starts_at} → {r.ends_at||"sem término"}</small></article>)}</div><div className="cv-pagination"><span>{filtered.length} vínculos · página {currentPage} de {totalPages}</span><div>{currentPage>1&&<Link className="button button-secondary button-compact" href={pageHref(currentPage-1)}>Anterior</Link>}{currentPage<totalPages&&<Link className="button button-secondary button-compact" href={pageHref(currentPage+1)}>Próxima</Link>}</div></div></>}</section>
    {showForm&&canManage&&<section className="cv-panel v2-resident-form"><div className="cv-panel-heading"><div><h2>{newLabel}</h2><p>A pessoa deve estar vinculada a este condomínio. Períodos históricos são preservados.</p></div><Link className="button button-secondary button-compact" href={closeHref}>Cancelar</Link></div><PersonRelationshipForm people={people} units={units} kind={kind} returnTo={returnTo} selectedPersonId={selectedPersonId}/></section>}
  </div>;
}

function initials(name:string) { return name.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join("").toUpperCase(); }
function formatOwnershipPercentage(value:number) { return `${new Intl.NumberFormat("pt-BR",{maximumFractionDigits:4}).format(value)}%`; }
