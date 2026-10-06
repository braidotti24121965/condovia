import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { ReservationList, type ReservationListRow } from "@/components/reservations/reservation-list";

export const metadata = { title: "Reservas" };

export default async function ReservationsPage() {
  const { supabase, context, user } = await requireCondominiumPermission("reservations.resources.read");
  const [{ data: resources }, { data: units }, { data: reservations }, { data: condo }, { data: account }] = await Promise.all([
    supabase.from("reservable_resources").select("id,name,reservation_mode,minimum_advance_minutes,maximum_advance_minutes,minimum_duration_minutes,maximum_duration_minutes,buffer_minutes,hours:reservable_resource_hours(weekday,start_time,end_time)").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("units").select("id,code,display_name").eq("condominium_id", context.id).eq("operational_status", "active").order("code"),
    supabase.from("reservations").select("id,requester_person_id,starts_at,ends_at,status,created_at,resource:reservable_resources(name),unit:units(code),requester:person_condominium_links!reservations_requester_person_id_condominium_id_fkey(person:people(full_name))").eq("condominium_id", context.id).order("starts_at", { ascending: false }).limit(20),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
    supabase.from("user_accounts").select("person_id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle(),
  ]);
  const timeZone = condo?.timezone || "America/Sao_Paulo";
  const rows: ReservationListRow[] = (reservations || []).map((reservation) => ({ id: reservation.id, resourceName: (reservation.resource as { name?: string } | null)?.name || "—", unitCode: (reservation.unit as { code?: string } | null)?.code || "—", requesterName: ((reservation.requester as { person?: { full_name?: string } | null } | null)?.person)?.full_name || "—", date: new Intl.DateTimeFormat("en-CA", { timeZone: timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(reservation.starts_at)), schedule: `${formatDateTimeInTimezone(reservation.starts_at, timeZone).split(", ")[1]}–${formatDateTimeInTimezone(reservation.ends_at, timeZone).split(", ")[1]}`, status: reservation.status as ReservationListRow["status"] }));
  const agendaReservations = (reservations || []).filter((reservation) => reservation.status === "pending" || reservation.status === "approved").map((reservation) => ({ starts_at: reservation.starts_at, ends_at: reservation.ends_at, own: reservation.requester_person_id === account?.person_id }));
  return <div className="cv-page"><div className="page-heading"><div><p className="page-overline">RESERVAS</p><h1>Reservas</h1><p>Solicite horários para recursos do condomínio.</p></div><Link className="button button-outline" href="/app/reservations/resources">Recursos reserváveis</Link></div><section className="cv-panel"><div className="cv-panel-heading"><div><h2>Nova reserva</h2><p>Os horários são interpretados no fuso do condomínio.</p></div></div><ReservationForm resources={resources || []} units={units || []} reservations={agendaReservations} timeZone={timeZone} /></section><section className="cv-panel"><h2>Agenda e reservas</h2><ReservationList rows={rows} /></section></div>;
}
