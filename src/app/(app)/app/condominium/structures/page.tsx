import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { ChevronRight, Network, Plus } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { StructureForm } from "@/components/condominium/structure-form";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { buildStructureTree, type StructureNode, type StructureRecord } from "@/lib/condominium/catalog";

export const metadata = { title: "Estruturas" };
const types: Record<string,string> = { block:"Bloco", tower:"Torre", sector:"Setor", building:"Edifício", wing:"Ala", street:"Rua", phase:"Fase", other:"Outro" };

function Tree({ item, units, canManage }: { item: StructureNode; units: { structure_id:string|null; operational_status:string }[]; canManage:boolean }) {
  const children = item.children;
  const unitCount = units.filter((unit)=>unit.structure_id===item.id).length;
  return <li><details open><summary><StatusBadge variant={item.status === "active" ? "success" : "neutral"}>{item.status === "active" ? "Ativa" : "Inativa"}</StatusBadge><strong>{item.name}</strong><span className="cv-structure-meta">{types[item.structure_type] ?? item.structure_type}{item.code ? ` · ${item.code}` : ""} · {children.length} filhas · {unitCount} unidades diretas</span></summary><div className="cv-tree-actions">{canManage && <Link className="button button-outline button-small" href={`/app/condominium/structures/${item.id}`}>Editar</Link>}</div>{children.length>0 && <ul>{children.map((child)=><Tree key={child.id} item={child} units={units} canManage={canManage}/>)}</ul>}</details></li>;
}

export default async function StructuresPage({ searchParams }: { searchParams:Promise<{ error?:string; saved?:string }> }) {
  const { supabase, context } = await requireCondominiumPermission("structures.read");
  const [{ data: structures, error: structuresError }, { data: units, error: unitsError }, { data: canManage }, params] = await Promise.all([
    supabase.from("condominium_structures").select("id,parent_id,name,code,structure_type,sort_order,status").eq("condominium_id",context.id).order("sort_order").order("name"),
    supabase.from("units").select("structure_id,operational_status").eq("condominium_id",context.id),
    supabase.rpc("has_permission",{permission_code:"structures.manage",target_condominium_id:context.id}), searchParams,
  ]);
  const rows = (structures ?? []) as StructureRecord[];
  const roots = buildStructureTree(rows);
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><strong>Estruturas</strong></div><section className="page-heading"><div><p className="page-overline">CONDOMÍNIO</p><h1>Estruturas</h1><p>Organize blocos, torres e demais níveis físicos do condomínio.</p></div></section>
    {params.error&&<Alert tone="error">{params.error}</Alert>}{params.saved&&<Alert tone="success">Estrutura salva.</Alert>}{structuresError&&<Alert tone="error">Não foi possível carregar as estruturas agora.</Alert>}{unitsError&&<Alert tone="error">Não foi possível carregar as contagens de unidades.</Alert>}
    {structuresError ? null : roots.length===0 ? <EmptyState title="Nenhuma estrutura cadastrada" description="Condomínios sem estrutura intermediária podem cadastrar unidades diretamente na raiz."/> : <section className="cv-panel"><div className="cv-panel-heading"><div><h2><Network size={18}/> Hierarquia</h2><p>{rows.length} estruturas cadastradas</p></div></div><ul className="cv-tree">{roots.map((item)=><Tree key={item.id} item={item} units={units??[]} canManage={canManage===true}/>)}</ul></section>}
    {canManage===true && <section className="cv-panel"><div className="cv-panel-heading"><div><h2><Plus size={18}/> Nova estrutura</h2><p>Crie uma estrutura raiz ou defina uma estrutura superior.</p></div></div><StructureForm structures={rows}/></section>}
  </div>;
}
