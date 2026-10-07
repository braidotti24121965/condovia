import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { friendlyDatabaseError } from "@/lib/condominium/format";
import { shouldShowFloor } from "@/lib/condominium/unit-presentation";
import { filterUnitCatalog, sanitizeCatalogSearch } from "@/lib/condominium/catalog";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { UnitForm } from "@/components/condominium/unit-form";
import { Alert, EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Unidades" };
const typeLabels:Record<string,string>={apartment:"Apartamento",house:"Casa",lot:"Lote",commercial:"Comercial",office:"Escritório",store:"Loja",other:"Outra"};
const statusLabels:Record<string,string>={active:"Ativa",inactive:"Inativa",under_construction:"Em construção",blocked:"Bloqueada"};

export default async function UnitsPage({searchParams}:{searchParams:Promise<{q?:string;structure?:string;type?:string;status?:string;page?:string;error?:string;saved?:string}>}){
  const {supabase,context}=await requireCondominiumPermission("units.read"); const params=await searchParams;
  const queryText=sanitizeCatalogSearch(params.q??"");
  const pageSize=50;
  let countQuery=supabase.from("units").select("id",{count:"exact",head:true}).eq("condominium_id",context.id);
  if(queryText) countQuery=countQuery.or(`code.ilike.%${queryText}%,display_name.ilike.%${queryText}%`);
  if(params.structure) countQuery=countQuery.eq("structure_id",params.structure);
  if(params.type&&typeLabels[params.type]) countQuery=countQuery.eq("unit_type",params.type);
  if(params.status&&statusLabels[params.status]) countQuery=countQuery.eq("operational_status",params.status);
  const [{count,error},{data:structures},{data:canManage}]=await Promise.all([
    countQuery,
    supabase.from("condominium_structures").select("id,name,status").eq("condominium_id",context.id).order("name"),
    supabase.rpc("has_permission",{permission_code:"units.manage",target_condominium_id:context.id}),
  ]);
  const { data: condominium } = await supabase.from("condominiums").select("condominium_type").eq("id",context.id).maybeSingle();
  const isHorizontal = !shouldShowFloor(condominium?.condominium_type);
  const pageCount=Math.max(1,Math.ceil((count??0)/pageSize));
  const requestedPage=Number.parseInt(params.page??"1",10)||1;
  const page=Math.min(Math.max(1,requestedPage),pageCount);
  let query=supabase.from("units").select("id,structure_id,code,display_name,unit_type,floor,operational_status,condominium_structures(name)").eq("condominium_id",context.id);
  if(queryText) query=query.or(`code.ilike.%${queryText}%,display_name.ilike.%${queryText}%`);
  if(params.structure) query=query.eq("structure_id",params.structure);
  if(params.type&&typeLabels[params.type]) query=query.eq("unit_type",params.type);
  if(params.status&&statusLabels[params.status]) query=query.eq("operational_status",params.status);
  const {data:units,error:rowsError}=await query.order("code").range((page-1)*pageSize,page*pageSize-1);
  const listError=error??rowsError;
  const rows=filterUnitCatalog(units??[],{query:queryText,structure:params.structure,type:params.type,status:params.status});
  const structureName=(row:typeof rows[number])=>(row.condominium_structures as unknown as {name:string}|null)?.name??"Sem estrutura";
  const pageHref=(newPage:number)=>{const search=new URLSearchParams();if(params.q)search.set("q",params.q);if(params.structure)search.set("structure",params.structure);if(params.type)search.set("type",params.type);if(params.status)search.set("status",params.status);search.set("page",String(newPage));return `/app/condominium/units?${search.toString()}`;};
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><strong>Unidades</strong></div><section className="page-heading"><div><p className="page-overline">CONDOMÍNIO</p><h1>Unidades</h1><p>Consulte e mantenha o cadastro de unidades de {context.name}.</p></div></section>
    {params.error&&<Alert tone="error">{params.error}</Alert>}{params.saved&&<Alert tone="success">Unidade salva.</Alert>}
    <section className="cv-panel"><form method="get" className="cv-filters"><label className="cv-search"><span className="sr-only">Buscar unidade por código ou nome</span><Search size={17}/><input name="q" placeholder="Buscar por código ou nome" defaultValue={params.q}/></label><label>Estrutura<select name="structure" defaultValue={params.structure??""}><option value="">Todas</option>{(structures??[]).map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Tipo<select name="type" defaultValue={params.type??""}><option value="">Todos</option>{Object.entries(typeLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Status<select name="status" defaultValue={params.status??""}><option value="">Todos</option>{Object.entries(statusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><Button variant="secondary" type="submit">Filtrar</Button></form>
      {listError?<Alert tone="error">{friendlyDatabaseError(listError.message)}</Alert>:rows.length===0?<EmptyState title={queryText||params.structure||params.type||params.status?"Nenhuma unidade encontrada":"Nenhuma unidade cadastrada"} description={queryText||params.structure||params.type||params.status?"Ajuste a busca ou os filtros para ver outros resultados.":"Cadastre unidades com ou sem estrutura intermediária."}/>:<><div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Unidade</th><th>Estrutura</th><th>Tipo</th>{!isHorizontal&&<th>Andar</th>}<th>Status</th></tr></thead><tbody>{rows.map((unit)=><tr key={unit.id}><td><Link href={`/app/condominium/units/${unit.id}`}><strong>{unit.code}</strong>{unit.display_name&&<small>{unit.display_name}</small>}</Link></td><td>{structureName(unit)}</td><td>{typeLabels[unit.unit_type]??unit.unit_type}</td>{!isHorizontal&&<td>{unit.floor||"—"}</td>}<td><StatusBadge variant={unit.operational_status === "active" ? "success" : unit.operational_status === "suspended" ? "warning" : "neutral"}>{statusLabels[unit.operational_status]??unit.operational_status}</StatusBadge></td></tr>)}</tbody></table></div><div className="cv-unit-cards">{rows.map((unit)=><Link className="cv-unit-card" href={`/app/condominium/units/${unit.id}`} key={unit.id}><span><strong>{unit.code}</strong><StatusBadge variant={unit.operational_status === "active" ? "success" : unit.operational_status === "suspended" ? "warning" : "neutral"}>{statusLabels[unit.operational_status]??unit.operational_status}</StatusBadge></span>{unit.display_name&&<small>{unit.display_name}</small>}<span>{structureName(unit)} · {typeLabels[unit.unit_type]??unit.unit_type}</span>{!isHorizontal&&<span>Andar: {unit.floor||"—"}</span>}</Link>)}</div>{pageCount>1&&<nav className="cv-pagination" aria-label="Paginação de unidades"><span>{count} unidades · página {page} de {pageCount}</span><div>{page>1&&<Link className="button button-outline button-small" href={pageHref(page-1)}><ChevronLeft size={16}/> Anterior</Link>}{page<pageCount&&<Link className="button button-outline button-small" href={pageHref(page+1)}>Próxima <ChevronRight size={16}/></Link>}</div></nav>}</>}
    </section>
    {canManage===true&&<section className="cv-panel"><div className="cv-panel-heading"><div><h2><Plus size={18}/> Nova unidade</h2><p>Uma unidade pode ficar diretamente no condomínio, sem estrutura.</p></div></div><UnitForm structures={structures??[]}/></section>}
  </div>;
}
