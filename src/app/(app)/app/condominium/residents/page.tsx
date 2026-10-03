import { requireCondominiumPermission } from "@/lib/condominium/access";
import { getCondominiumPeopleOptions, getCondominiumUnits, getRelationshipRows, todayInTimezone } from "@/lib/condominium/people-data";
import { RelationshipIndex } from "@/components/condominium/relationship-index";
import { Alert } from "@/components/ui/feedback";

export const metadata={title:"Moradores"};
export default async function ResidentsPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string;mode?:string;q?:string;structure?:string;unit?:string;type?:string;newPersonId?:string;relationship?:string}>}) {
  const {supabase,context}=await requireCondominiumPermission("residents.read"); const params=await searchParams;
  const [{data:condo},{rows,error},people,units,{data:canManage}]=await Promise.all([
    supabase.from("condominiums").select("timezone").eq("id",context.id).maybeSingle(),
    getRelationshipRows(supabase,context.id,"occupancy"),getCondominiumPeopleOptions(supabase,context.id),getCondominiumUnits(supabase,context.id),supabase.rpc("has_permission",{permission_code:"residents.manage",target_condominium_id:context.id}),
  ]);
  if(error)return <div className="cv-page"><Alert tone="error">Não foi possível carregar os moradores.</Alert></div>;
  const mode=["current","future","ended","all"].includes(params.mode||"")?params.mode!:"current";
  const type=["owner","tenant","family_member","dependent","other"].includes(params.type||"")?params.type!:"";
  const returnQuery=new URLSearchParams();for(const key of ["mode","q","structure","unit","type"] as const)if(params[key])returnQuery.set(key,params[key]!);
  const returnTo=`/app/condominium/residents${returnQuery.size?`?${returnQuery.toString()}`:""}`;
  const selectedPersonId=params.relationship==="occupancy"?params.newPersonId:undefined;
  return <>{params.error&&<Alert tone="error">{params.error}</Alert>}{params.saved&&<Alert tone="success">Vínculo salvo.</Alert>}<div className="breadcrumbs"><strong>Condomínio</strong><span aria-hidden="true">›</span><strong>Moradores</strong></div><RelationshipIndex kind="occupancy" rows={rows} people={people} units={units} mode={mode} today={todayInTimezone(condo?.timezone||"America/Sao_Paulo")} canManage={canManage===true} returnTo={returnTo} selectedPersonId={selectedPersonId} q={params.q||""} structureId={params.structure||""} unitId={params.unit||""} occupancyType={type}/></>;
}
