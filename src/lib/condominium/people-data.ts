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
  const {data}=await supabase.rpc("list_units_for_condominium",{p_condominium_id:condominiumId});
  const rows=(data||[]) as Array<{id:string;code:string;display_name:string|null;structure_id:string|null;operational_status:string}>; const structureIds=[...new Set(rows.map((row)=>row.structure_id).filter((id):id is string=>!!id))];
  const {data:structures}=structureIds.length?await supabase.rpc("list_structures_for_condominium",{p_condominium_id:condominiumId}):{data:[]};
  const names=new Map(((structures||[]) as Array<{id:string;name:string}>).map((structure)=>[structure.id,structure.name]));
  return rows.map((row)=>({...row,structure_name:row.structure_id?names.get(row.structure_id)||"Estrutura":"Sem estrutura"}));
}

export async function getRelationshipRows(supabase: SupabaseClient, condominiumId: string, kind: "ownership"|"occupancy", options: { query?: string; cpf?: string; unitId?: string } = {}) {
  type UnitLookup = { id:string; code:string; display_name:string|null; structure_id:string|null };
  const table=kind==="ownership"?"unit_ownerships":"unit_occupancies";
  const selection=kind==="ownership"?"id,person_id,unit_id,starts_at,ends_at,ownership_percentage":"id,person_id,unit_id,starts_at,ends_at,occupancy_type,is_primary";
  let personFilter: string[] | null = null;
  if (options.query || options.cpf) {
    const { data: matches, error: peopleError } = await supabase.rpc("list_people_for_condominium", { p_condominium_id: condominiumId, p_limit: 100, p_offset: 0, p_query: options.query || null, p_cpf: options.cpf || null, p_status: null });
    if (peopleError) return { rows: [] as RelationshipRow[], error: peopleError };
    personFilter = (matches || []).map((person: { id: string }) => person.id);
    if (!personFilter || !personFilter.length) return { rows: [] as RelationshipRow[], error: null };
  }
  const rawRows: unknown[] = [];
  for (let offset = 0; ; offset += 500) {
    let relationshipQuery = supabase.from(table).select(selection).eq("condominium_id",condominiumId).order("starts_at",{ascending:false});
    if (personFilter) relationshipQuery = relationshipQuery.in("person_id", personFilter);
    if (options.unitId) relationshipQuery = relationshipQuery.eq("unit_id", options.unitId);
    const { data, error } = await relationshipQuery.range(offset, offset + 499);
    if (error) return { rows: [] as RelationshipRow[], error };
    rawRows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  const raw=rawRows as Omit<RelationshipRow,"person_name"|"unit_code"|"unit_name">[];
  const personIds=[...new Set(raw.map((row)=>row.person_id))]; const unitIds=[...new Set(raw.map((row)=>row.unit_id))];
  const chunks = <T,>(items:T[], size:number) => Array.from({length:Math.ceil(items.length/size)},(_,index)=>items.slice(index*size,(index+1)*size));
  const [peopleLookups,unitsLookups]=await Promise.all([
    Promise.all(chunks(personIds,500).map((ids)=>supabase.rpc("list_relationship_people",{p_condominium_id:condominiumId,p_person_ids:ids}))),
    Promise.all(chunks(unitIds,500).map((ids)=>supabase.rpc("list_relationship_units",{p_condominium_id:condominiumId,p_unit_ids:ids}))),
  ]);
  const peopleError=peopleLookups.find((result)=>result.error)?.error;
  const unitsError=unitsLookups.find((result)=>result.error)?.error;
  if (peopleError) return { rows: [] as RelationshipRow[], error: peopleError };
  if (unitsError) return { rows: [] as RelationshipRow[], error: unitsError };
  const people=peopleLookups.flatMap((result)=>result.data||[]);
  const typedUnits=unitsLookups.flatMap((result)=>result.data||[]) as UnitLookup[];
  const structureIds=[...new Set(typedUnits.map((u)=>u.structure_id).filter((id):id is string=>!!id))];
  const {data:structures}=structureIds.length?await supabase.from("condominium_structures").select("id,name").eq("condominium_id",condominiumId).in("id",structureIds):{data:[]};
  const names=new Map(((people||[]) as Array<{id:string;full_name:string}>).map((p)=>[p.id,p.full_name])); const unitMap=new Map(typedUnits.map((u)=>[u.id,u])); const structureNames=new Map((structures||[]).map((s)=>[s.id,s.name]));
  const rows=raw.map((row)=>{const unit=unitMap.get(row.unit_id);return { ...row, person_name:names.get(row.person_id)||"Pessoa",unit_code:unit?.code||"Unidade",unit_name:unit?.display_name||null,structure_id:unit?.structure_id||null,structure_name:unit?.structure_id?structureNames.get(unit.structure_id)||"Estrutura":"Sem estrutura"};});
  rows.sort((a,b)=>a.person_name.localeCompare(b.person_name,"pt-BR",{sensitivity:"base"})||a.unit_code.localeCompare(b.unit_code,"pt-BR",{numeric:true,sensitivity:"base"}));
  return {rows,error:null};
}

export function todayInTimezone(timezone: string) {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  return parts;
}
