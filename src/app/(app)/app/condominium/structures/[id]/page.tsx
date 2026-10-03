import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ConfirmedForm } from "@/components/condominium/confirmed-form";
import { StructureForm } from "@/components/condominium/structure-form";
import { saveStructure } from "@/lib/condominium/actions";
import { requireCondominiumPermission } from "@/lib/condominium/access";

export const metadata = { title: "Editar estrutura" };
export default async function StructureDetail({ params }: { params:Promise<{id:string}> }) {
  const { id }=await params; const {supabase,context}=await requireCondominiumPermission("structures.read");
  const [{data:item}, {data:all}, {data:canManage}]=await Promise.all([
    supabase.from("condominium_structures").select("id,parent_id,name,code,structure_type,sort_order,status").eq("id",id).eq("condominium_id",context.id).maybeSingle(),
    supabase.from("condominium_structures").select("id,parent_id,name,code,structure_type,sort_order,status").eq("condominium_id",context.id),
    supabase.rpc("has_permission",{permission_code:"structures.manage",target_condominium_id:context.id}),
  ]);
  if(!item) notFound(); if(canManage!==true) redirect("/no-permission");
  const {count:children}=await supabase.from("condominium_structures").select("id",{count:"exact",head:true}).eq("parent_id",id).eq("status","active");
  const {count:units}=await supabase.from("units").select("id",{count:"exact",head:true}).eq("structure_id",id).eq("operational_status","active");
  return <div className="cv-page"><div className="breadcrumbs"><Link href="/app/condominium">Condomínio</Link><ChevronRight size={14}/><Link href="/app/condominium/structures">Estruturas</Link><ChevronRight size={14}/><strong>{item.name}</strong></div><section className="page-heading"><div><p className="page-overline">ESTRUTURA</p><h1>Editar estrutura</h1><p>Atualize os dados ou o status de {item.name}.</p></div></section><section className="cv-panel"><StructureForm structures={all??[]} current={item}/></section>{item.status==="active" ? <section className="cv-panel"><h2>Inativar estrutura</h2><p>O banco bloqueará a ação enquanto houver estruturas descendentes ou unidades ativas nesta hierarquia. Nenhum status será alterado em cascata.</p><ConfirmedForm action={saveStructure} confirmation={`Inativar a estrutura ${item.name}? Nenhuma estrutura ou unidade filha será inativada automaticamente.`}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="parent_id" value={item.parent_id??""}/><input type="hidden" name="structure_type" value={item.structure_type}/><input type="hidden" name="name" value={item.name}/><input type="hidden" name="code" value={item.code??""}/><input type="hidden" name="sort_order" value={item.sort_order}/><input type="hidden" name="status" value="inactive"/><button className="button button-destructive" type="submit">Inativar estrutura</button></ConfirmedForm><small>{children??0} filhos ativos diretos · {units??0} unidades diretas ativas</small></section> : <section className="cv-panel"><h2>Reativar estrutura</h2><p>A estrutura só será reativada se sua estrutura superior também estiver ativa.</p><form action={saveStructure}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="parent_id" value={item.parent_id??""}/><input type="hidden" name="structure_type" value={item.structure_type}/><input type="hidden" name="name" value={item.name}/><input type="hidden" name="code" value={item.code??""}/><input type="hidden" name="sort_order" value={item.sort_order}/><input type="hidden" name="status" value="active"/><button className="button button-secondary" type="submit">Reativar estrutura</button></form></section>}</div>;
}
