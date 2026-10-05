import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { ResourceForm } from "@/components/reservations/resource-form";

export const metadata = { title: "Recursos reserváveis" };

export default async function ReservableResourcesPage() {
  const { supabase, context } = await requireCondominiumPermission("reservations.resources.read");
  const { data: resources } = await supabase.from("reservable_resources").select("*").eq("condominium_id", context.id).order("name");
  const resourceIds = (resources || []).map((resource) => resource.id);
  const { data: hours } = resourceIds.length ? await supabase.from("reservable_resource_hours").select("*").in("resource_id", resourceIds).eq("condominium_id", context.id).order("weekday").order("start_time") : { data: [] };
  return <div className="cv-page"><div className="page-heading"><div><p className="page-overline">RESERVAS</p><h1>Recursos reserváveis</h1><p>Configure espaços, regras e horários disponíveis do condomínio.</p></div><div><Link className="button button-outline" href="/app/reservations">Reservas</Link> <ResourceForm /></div></div>{(resources || []).map((resource) => <section className="cv-panel" key={resource.id}><div className="cv-panel-heading"><div><h2>{resource.name}</h2><p>{resource.location || "Localização não informada"} · {resource.status === "active" ? "Ativo" : "Inativo"}</p></div><ResourceForm resource={resource} hours={(hours || []).filter((hour) => hour.resource_id === resource.id)} /></div><p>{resource.description || "Sem descrição."}</p><p className="cv-muted">{(hours || []).filter((hour) => hour.resource_id === resource.id && hour.active).map((hour) => `${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][hour.weekday]} ${String(hour.start_time).slice(0, 5)}–${String(hour.end_time).slice(0, 5)}`).join(" · ") || "Nenhum horário ativo"}</p></section>)}</div>;
}
