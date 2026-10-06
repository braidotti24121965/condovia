import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { formatReservationSchedule } from "@/lib/reservations/reservation-presenters";
import { ReservationList, type ReservationListRow } from "@/components/reservations/reservation-list";

export const metadata = { title: "Reservas" };

export default async function ReservationsPage() {
  const { supabase, context, user } = await requireCondominiumPermission("reservations.resources.read");
  const [{ data: resources }, { data: units }, { data: reservations, error: reservationsError }, { data: condo }, { data: account }, { data: blocks }] = await Promise.all([
    supabase.from("reservable_resources").select("id,name,reservation_mode,minimum_advance_minutes,maximum_advance_minutes,minimum_duration_minutes,maximum_duration_minutes,buffer_minutes,hours:reservable_resource_hours(weekday,start_time,end_time)").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("units").select("id,code,display_name").eq("condominium_id", context.id).eq("operational_status", "active").order("code"),
    supabase.from("reservations").select("id,resource_id,requester_person_id,starts_at,ends_at,status,created_at,reservation_mode,notes,usage_fee,resource:reservable_resources(name,reservation_mode),unit:units(code),requester:person_condominium_links!reservations_requester_person_id_condominium_id_fkey(person:people(full_name))").eq("condominium_id", context.id).order("starts_at", { ascending: false }).limit(20),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
    supabase.from("user_accounts").select("person_id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle(),
    supabase.rpc("get_reservation_resource_blocks", { p_condominium_id: context.id, p_resource_id: null }),
  ]);
  if (reservationsError) throw new Error(`Não foi possível carregar as reservas: ${reservationsError.message}`);
  const { data: reservationHistory } = reservations?.length ? await supabase.from("reservation_status_history").select("reservation_id,changed_at,previous_status,new_status,reason,changed_by_user_account_id").in("reservation_id", reservations.map((reservation) => reservation.id)) : { data: [] };
  const historyByReservation = new Map<string, Array<{ changed_at: string; previous_status: string; new_status: string; reason?: string | null }>>();
  for (const event of reservationHistory || []) { const events = historyByReservation.get(event.reservation_id) || []; events.push(event); historyByReservation.set(event.reservation_id, events); }
  const timeZone = condo?.timezone || "America/Sao_Paulo";
  const rows: ReservationListRow[] = (reservations || []).map((reservation) => { const mode = (reservation.reservation_mode || (reservation.resource as { reservation_mode?: "day" | "time_slot" } | null)?.reservation_mode || "time_slot") as "day" | "time_slot"; const history = (historyByReservation.get(reservation.id) || []).map((event) => ({ event: event.previous_status === "created" ? "Solicitação criada" : event.new_status === "approved" ? "Reserva aprovada" : event.new_status === "rejected" ? "Reserva rejeitada" : "Reserva cancelada", at: event.changed_at, reason: event.reason })); return { id: reservation.id, resourceName: (reservation.resource as { name?: string } | null)?.name || "—", reservationMode: mode, unitCode: (reservation.unit as { code?: string } | null)?.code || "—", requesterName: ((reservation.requester as { person?: { full_name?: string } | null } | null)?.person)?.full_name || "—", date: new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(reservation.starts_at)), schedule: formatReservationSchedule(mode, reservation.starts_at, reservation.ends_at, timeZone), status: reservation.status as ReservationListRow["status"], endsAt: reservation.ends_at, notes: reservation.notes, usageFee: reservation.usage_fee, requestedAt: reservation.created_at, history: history.length ? history : [{ event: "Solicitação criada (derivada do registro da reserva)", at: reservation.created_at }] }; });
  const agendaReservations = (reservations || []).filter((reservation) => reservation.status === "pending" || reservation.status === "approved").map((reservation) => ({ resource_id: reservation.resource_id, starts_at: reservation.starts_at, ends_at: reservation.ends_at, own: reservation.requester_person_id === account?.person_id }));
  return <div className="cv-page"><div className="page-heading"><div><p className="page-overline">RESERVAS</p><h1>Reservas</h1><p>Solicite horários para recursos do condomínio.</p></div><Link className="button button-outline" href="/app/reservations/resources">Recursos reserváveis</Link></div><section className="cv-panel"><div className="cv-panel-heading"><div><h2>Nova reserva</h2><p>Os horários são interpretados no fuso do condomínio.</p></div></div><ReservationForm resources={resources || []} units={units || []} reservations={agendaReservations} blocks={blocks || []} timeZone={timeZone} /></section><section className="cv-panel"><h2>Agenda e reservas</h2><ReservationList rows={rows} /></section></div>;
}
