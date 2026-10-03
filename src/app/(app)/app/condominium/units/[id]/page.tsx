import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ConfirmedForm } from "@/components/condominium/confirmed-form";
import { UnitForm } from "@/components/condominium/unit-form";
import { saveUnit } from "@/lib/condominium/actions";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { Alert } from "@/components/ui/feedback";

export const metadata={title:"Detalhe da unidade"};
const types:Record<string,string>={apartment:"Apartamento",house:"Casa",lot:"Lote",commercial:"Comercial",office:"Escritório",store:"Loja",other:"Outra"};
const statuses:Record<string,string>={active:"Ativa",inactive:"Inativa",under_construction:"Em construção",blocked:"Bloqueada"};
export default async function UnitDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const {supabase,context}=await requireCondominiumPermission("units.read");
  const [{data:unit,error},{data:structures},{data:canManage}]=await Promise.all([
    supabase.from("units").select("id,structure_id,code,display_name,unit_type,floor,area,ownership_fraction,operational_status,notes,condominium_structures(name)").eq("id",id).eq("condominium_id",context.id).maybeSingle(),
    supabase.from("condominium_structures").select("id,name,status").eq("condominium_id",context.id),
    supabase.rpc("has_permission",{permission_code:"units.manage",target_condominium_id:context.id}),
  ]);
  if(error)return <Alert tone="error">Não foi possível carregar os dados da unidade agora.</Alert>;
  if(!unit)notFound();const structure=(unit.condominium_structures as unknown as {name:string}|null)?.name??"Sem estrutura";
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><Link href="/app/condominium/units">Unidades</Link><ChevronRight size={14}/><strong>{unit.code}</strong></div><section className="page-heading"><div><p className="page-overline">UNIDADE</p><h1>{unit.display_name||unit.code}</h1><p>{structure} · {types[unit.unit_type]??unit.unit_type}</p></div><span className={`cv-status cv-status-${unit.operational_status}`}>{statuses[unit.operational_status]??unit.operational_status}</span></section>
    <section className="cv-panel"><h2>Dados da unidade</h2>{canManage===true?<UnitForm structures={structures??[]} current={unit}/>:<div className="cv-read-grid"><p><span>Código</span><strong>{unit.code}</strong></p><p><span>Nome</span><strong>{unit.display_name||"Não informado"}</strong></p><p><span>Tipo</span><strong>{types[unit.unit_type]??unit.unit_type}</strong></p><p><span>Estrutura</span><strong>{structure}</strong></p><p><span>Andar</span><strong>{unit.floor||"Não informado"}</strong></p><p><span>Área</span><strong>{unit.area===null?"Não informada":`${new Intl.NumberFormat("pt-BR",{maximumFractionDigits:2}).format(unit.area)} m²`}</strong></p><p><span>Fração ideal</span><strong>{unit.ownership_fraction===null?"Não informada":`${new Intl.NumberFormat("pt-BR",{maximumFractionDigits:6}).format(unit.ownership_fraction)}%`}</strong></p><p><span>Status</span><strong>{statuses[unit.operational_status]??unit.operational_status}</strong></p><p className="cv-read-wide"><span>Observações</span><strong>{unit.notes||"Não informado"}</strong></p></div>}</section>
    {canManage===true&&unit.operational_status!=="inactive"&&<section className="cv-panel"><h2>Inativar unidade</h2><p>A unidade continuará no histórico e poderá ser reativada depois.</p><ConfirmedForm action={saveUnit} confirmation={`Inativar a unidade ${unit.display_name||unit.code}?`}><input type="hidden" name="id" value={unit.id}/><input type="hidden" name="code" value={unit.code}/><input type="hidden" name="display_name" value={unit.display_name??""}/><input type="hidden" name="unit_type" value={unit.unit_type}/><input type="hidden" name="structure_id" value={unit.structure_id??""}/><input type="hidden" name="floor" value={unit.floor??""}/><input type="hidden" name="area" value={unit.area??""}/><input type="hidden" name="ownership_fraction" value={unit.ownership_fraction??""}/><input type="hidden" name="notes" value={unit.notes??""}/><input type="hidden" name="operational_status" value="inactive"/><button className="button button-destructive" type="submit">Inativar unidade</button></ConfirmedForm></section>}</div>;
}
