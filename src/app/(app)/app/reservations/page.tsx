import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { reservationStatusLabels, type ReservationStatus } from "@/lib/reservations/reservation-presenters";

export const metadata = { title: "Reservas" };

export default async function ReservationsPage() {
  const { supabase, context } = await requireCondominiumPermission("reservations.resources.read");
  const [{ data: resources }, { data: units }, { data: reservations }, { data: condo }] = await Promise.all([
    supabase.from("reservable_resources").select("id,name").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("units").select("id,code,display_name").eq("condominium_id", context.id).eq("operational_status", "active").order("code"),
    supabase.from("reservations").select("id,starts_at,ends_at,status,resource:reservable_resources(name),unit:units(code)").eq("condominium_id", context.id).order("starts_at", { ascending: false }).limit(20),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
  ]);
  const timeZone = condo?.timezone || "America/Sao_Paulo";
  return <div className="cv-page"><div className="page-heading"><div><p className="page-overline">RESERVAS</p><h1>Reservas</h1><p>Solicite horários para recursos do condomínio.</p></div><Link className="button button-outline" href="/app/reservations/resources">Recursos reserváveis</Link></div><section className="cv-panel"><div className="cv-panel-heading"><div><h2>Nova reserva</h2><p>Os horários são interpretados no fuso do condomínio.</p></div></div><ReservationForm resources={resources || []} units={units || []} /></section><section className="cv-panel"><h2>Reservas recentes</h2>{reservations?.length ? <div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Recurso</th><th>Unidade</th><th>Início</th><th>Status</th></tr></thead><tbody>{reservations.map((reservation) => <tr key={reservation.id}><td>{(reservation.resource as { name?: string } | null)?.name || "—"}</td><td>{(reservation.unit as { code?: string } | null)?.code || "—"}</td><td>{formatDateTimeInTimezone(reservation.starts_at, timeZone)}</td><td>{reservationStatusLabels[reservation.status as ReservationStatus] || "—"}</td></tr>)}</tbody></table></div> : <p className="cv-muted">Nenhuma reserva registrada.</p>}</section></div>;
}
