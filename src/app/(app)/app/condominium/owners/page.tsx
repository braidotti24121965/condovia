import { requireCondominiumPermission } from "@/lib/condominium/access";
import { getCondominiumPeopleOptions, getCondominiumUnits, getRelationshipRows, todayInTimezone } from "@/lib/condominium/people-data";
import { RelationshipIndex } from "@/components/condominium/relationship-index";
import { Alert } from "@/components/ui/feedback";

export const metadata={title:"Proprietários"};
export default async function OwnersPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string;mode?:string;q?:string;structure?:string;unit?:string;new?:string;newPersonId?:string;relationship?:string}>}) {
  const {supabase,context}=await requireCondominiumPermission("ownerships.read"); const params=await searchParams;
  const [{data:condo},{rows,error},people,units,{data:canManage}]=await Promise.all([
    supabase.from("condominiums").select("timezone").eq("id",context.id).maybeSingle(),
    getRelationshipRows(supabase,context.id,"ownership"),getCondominiumPeopleOptions(supabase,context.id),getCondominiumUnits(supabase,context.id),supabase.rpc("has_permission",{permission_code:"ownerships.manage",target_condominium_id:context.id}),
  ]);
  if(error)return <div className="cv-page"><Alert tone="error">Não foi possível carregar os proprietários.</Alert></div>;
  const mode=["current","future","ended","all"].includes(params.mode||"")?params.mode!:"current";
  const returnQuery=new URLSearchParams();for(const key of ["mode","q","structure","unit"] as const)if(params[key])returnQuery.set(key,params[key]!);
  const returnTo=`/app/condominium/owners${returnQuery.size?`?${returnQuery.toString()}`:""}`;
  const selectedPersonId=params.relationship==="ownership"?params.newPersonId:undefined;
  return <>{params.error&&<Alert tone="error">{params.error}</Alert>}{params.saved&&<Alert tone="success">Vínculo salvo.</Alert>}<div className="breadcrumbs"><strong>Condomínio</strong><span aria-hidden="true">›</span><strong>Proprietários</strong></div><RelationshipIndex kind="ownership" rows={rows} people={people} units={units} mode={mode} today={todayInTimezone(condo?.timezone||"America/Sao_Paulo")} canManage={canManage===true} returnTo={returnTo} selectedPersonId={selectedPersonId} showForm={params.new==="1"||Boolean(selectedPersonId)} q={params.q||""} structureId={params.structure||""} unitId={params.unit||""}/></>;
}
