import type { SupabaseClient } from "@supabase/supabase-js";
import type { RelationshipRow } from "@/components/condominium/relationship-index";

export async function getCondominiumPeopleOptions(supabase: SupabaseClient, condominiumId: string) {
  const { data: links } = await supabase.from("person_condominium_links").select("person_id").eq("condominium_id",condominiumId).eq("status","active");
  const ids=(links||[]).map((row)=>row.person_id);
  if(!ids.length)return [];
  const {data}=await supabase.from("people").select("id,full_name").in("id",ids).eq("status","active").order("full_name");
  return data||[];
}

export async function getCondominiumUnits(supabase: SupabaseClient, condominiumId: string) {
  const {data}=await supabase.from("units").select("id,code,display_name,structure_id,operational_status").eq("condominium_id",condominiumId).order("code");
  const rows=data||[]; const structureIds=[...new Set(rows.map((row)=>row.structure_id).filter((id):id is string=>!!id))];
  const {data:structures}=structureIds.length?await supabase.from("condominium_structures").select("id,name").eq("condominium_id",condominiumId).in("id",structureIds):{data:[]};
  const names=new Map((structures||[]).map((structure)=>[structure.id,structure.name]));
  return rows.map((row)=>({...row,structure_name:row.structure_id?names.get(row.structure_id)||"Estrutura":"Sem estrutura"}));
}

export async function getRelationshipRows(supabase: SupabaseClient, condominiumId: string, kind: "ownership"|"occupancy") {
  const table=kind==="ownership"?"unit_ownerships":"unit_occupancies";
  const selection=kind==="ownership"?"id,person_id,unit_id,starts_at,ends_at,ownership_percentage":"id,person_id,unit_id,starts_at,ends_at,occupancy_type,is_primary";
  const {data,error}=await supabase.from(table).select(selection).eq("condominium_id",condominiumId).order("starts_at",{ascending:false});
  if(error)return {rows:[] as RelationshipRow[],error};
  const raw=(data||[]) as unknown as Omit<RelationshipRow,"person_name"|"unit_code"|"unit_name">[];
  const personIds=[...new Set(raw.map((row)=>row.person_id))]; const unitIds=[...new Set(raw.map((row)=>row.unit_id))];
  const [{data:people},{data:units}]=await Promise.all([
    personIds.length?supabase.from("people").select("id,full_name").in("id",personIds):Promise.resolve({data:[]}),
    unitIds.length?supabase.from("units").select("id,code,display_name,structure_id").in("id",unitIds).eq("condominium_id",condominiumId):Promise.resolve({data:[]}),
  ]);
  const structureIds=[...new Set((units||[]).map((u)=>u.structure_id).filter((id):id is string=>!!id))];
  const {data:structures}=structureIds.length?await supabase.from("condominium_structures").select("id,name").eq("condominium_id",condominiumId).in("id",structureIds):{data:[]};
  const names=new Map((people||[]).map((p)=>[p.id,p.full_name])); const unitMap=new Map((units||[]).map((u)=>[u.id,u])); const structureNames=new Map((structures||[]).map((s)=>[s.id,s.name]));
  return {rows:raw.map((row)=>{const unit=unitMap.get(row.unit_id);return { ...row, person_name:names.get(row.person_id)||"Pessoa",unit_code:unit?.code||"Unidade",unit_name:unit?.display_name||null,structure_id:unit?.structure_id||null,structure_name:unit?.structure_id?structureNames.get(unit.structure_id)||"Estrutura":"Sem estrutura"};}),error:null};
}

export function todayInTimezone(timezone: string) {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return parts;
}
