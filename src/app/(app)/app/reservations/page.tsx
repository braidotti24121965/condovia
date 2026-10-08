import Link from "next/link";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { ReservationForm } from "@/components/reservations/reservation-form";
import { formatReservationSchedule } from "@/lib/reservations/reservation-presenters";
import { ReservationList, type ReservationListRow } from "@/components/reservations/reservation-list";
import { MyReservations } from "@/components/reservations/my-reservations";

export const metadata = { title: "Reservas" };

export default async function ReservationsPage({ searchParams }: { searchParams?: Promise<{ status?: string; resource?: string; date?: string; page?: string }> }) {
  const { supabase, context, user } = await requireCondominiumPermission("reservations.resources.read");
  const params = await searchParams;
  const statusFilter = params?.status || "";
  const resourceFilter = params?.resource || "";
  const dateFilter = params?.date || "";
  const page = Math.max(1, Number(params?.page || "1") || 1);
  const pageSize = 20;
  const [{ data: resources }, { data: units }, { data: condo }, { data: account }, { data: blocks }, { data: canManage }, { data: agendaData }] = await Promise.all([
    supabase.from("reservable_resources").select("id,name,reservation_mode,minimum_advance_minutes,maximum_advance_minutes,minimum_duration_minutes,maximum_duration_minutes,buffer_minutes,hours:reservable_resource_hours(weekday,start_time,end_time)").eq("condominium_id", context.id).eq("status", "active").order("name"),
    supabase.from("units").select("id,code,display_name").eq("condominium_id", context.id).eq("operational_status", "active").order("code"),
    supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle(),
    supabase.from("user_accounts").select("person_id").eq("auth_user_id", user.id).eq("status", "active").maybeSingle(),
    supabase.rpc("get_reservation_resource_blocks", { p_condominium_id: context.id, p_resource_id: null }),
    supabase.rpc("has_permission", { permission_code: "reservations.manage", target_condominium_id: context.id }),
    supabase.from("reservations").select("resource_id,starts_at,ends_at,requester_person_id,status").eq("condominium_id", context.id).in("status", ["pending", "approved"]),
  ]);
  let reservationQuery = supabase.from("reservations").select("id,resource_id,requester_person_id,starts_at,ends_at,status,created_at,reservation_mode,notes,usage_fee,resource:reservable_resources(name,reservation_mode,cancellation_allowed,cancellation_deadline_minutes),unit:units(code),requester:person_condominium_links!reservations_requester_person_id_condominium_id_fkey(person:people(full_name))", { count: "exact" }).eq("condominium_id", context.id);
  if (["pending", "approved", "rejected", "cancelled"].includes(statusFilter)) reservationQuery = reservationQuery.eq("status", statusFilter);
  if (statusFilter === "completed") reservationQuery = reservationQuery.eq("status", "approved").lt("ends_at", new Date().toISOString());
  if (resourceFilter) { const resource = (resources || []).find((item) => item.id === resourceFilter); if (resource) reservationQuery = reservationQuery.eq("resource_id", resource.id); }
  if (dateFilter) { const nextDate = new Date(`${dateFilter}T00:00:00.000Z`); nextDate.setUTCDate(nextDate.getUTCDate() + 1); reservationQuery = reservationQuery.gte("starts_at", `${dateFilter}T00:00:00.000Z`).lt("starts_at", nextDate.toISOString()); }
  const { data: reservations, error: reservationsError, count: reservationCount } = await reservationQuery.order("starts_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (reservationsError) throw new Error(`Não foi possível carregar as reservas: ${reservationsError.message}`);
  const { data: reservationHistory } = reservations?.length ? await supabase.from("reservation_status_history").select("reservation_id,changed_at,previous_status,new_status,reason,changed_by_user_account_id").in("reservation_id", reservations.map((reservation) => reservation.id)) : { data: [] };
  const historyByReservation = new Map<string, Array<{ changed_at: string; previous_status: string; new_status: string; reason?: string | null }>>();
  for (const event of reservationHistory || []) { const events = historyByReservation.get(event.reservation_id) || []; events.push(event); historyByReservation.set(event.reservation_id, events); }
  const timeZone = condo?.timezone || "America/Sao_Paulo";
  const rows: ReservationListRow[] = (reservations || []).map((reservation) => { const mode = (reservation.reservation_mode || (reservation.resource as { reservation_mode?: "day" | "time_slot" } | null)?.reservation_mode || "time_slot") as "day" | "time_slot"; const resource = reservation.resource as { name?: string; reservation_mode?: "day" | "time_slot"; cancellation_allowed?: boolean; cancellation_deadline_minutes?: number } | null; const history = (historyByReservation.get(reservation.id) || []).map((event) => ({ event: event.previous_status === "created" ? "Solicitação criada" : event.new_status === "approved" ? "Reserva aprovada" : event.new_status === "rejected" ? "Reserva rejeitada" : "Reserva cancelada", at: event.changed_at, reason: event.reason })); const statusAllowsCancellation = reservation.status === "pending" || reservation.status === "approved"; const canCancel = canManage === true ? statusAllowsCancellation : statusAllowsCancellation && Boolean(resource?.cancellation_allowed) && Date.now() <= new Date(reservation.starts_at).getTime() - Number(resource?.cancellation_deadline_minutes || 0) * 60000; return { id: reservation.id, resourceName: resource?.name || "—", reservationMode: mode, unitCode: (reservation.unit as { code?: string } | null)?.code || "—", requesterName: ((reservation.requester as { person?: { full_name?: string } | null } | null)?.person)?.full_name || "—", date: new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(reservation.starts_at)), schedule: formatReservationSchedule(mode, reservation.starts_at, reservation.ends_at, timeZone), status: reservation.status as ReservationListRow["status"], endsAt: reservation.ends_at, canCancel, notes: reservation.notes, usageFee: reservation.usage_fee, requestedAt: reservation.created_at, history: history.length ? history : [{ event: "Solicitação criada (derivada do registro da reserva)", at: reservation.created_at }] }; });
  const agendaReservations = (agendaData || []).map((reservation) => ({ resource_id: reservation.resource_id, starts_at: reservation.starts_at, ends_at: reservation.ends_at, own: reservation.requester_person_id === account?.person_id }));
  const ownRows = rows.filter((row) => row.requestedAt && (reservations || []).some((reservation) => reservation.id === row.id && reservation.requester_person_id === account?.person_id));
  const total = reservationCount || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listQuery = (nextPage: number) => { const query = new URLSearchParams(); if (statusFilter) query.set("status", statusFilter); if (resourceFilter) query.set("resource", resourceFilter); if (dateFilter) query.set("date", dateFilter); query.set("page", String(nextPage)); return `/app/reservations?${query.toString()}`; };
  return <div className="cv-page"><div className="page-heading"><div><p className="page-overline">RESERVAS</p><h1>Reservas</h1><p>Solicite horários para recursos do condomínio.</p></div>{canManage === true && <Link className="button button-secondary" href="/app/reservations/resources">Recursos reserváveis</Link>}</div><section className="cv-panel"><div className="cv-panel-heading"><div><h2>Nova reserva</h2><p>Os horários são interpretados no fuso do condomínio.</p></div></div><ReservationForm resources={resources || []} units={units || []} reservations={agendaReservations} blocks={blocks || []} timeZone={timeZone} /></section><MyReservations rows={ownRows} />{canManage === true && <section className="cv-panel cv-reservation-agenda"><h2>Agenda e reservas</h2><ReservationList rows={rows} resourceOptions={(resources || []).map((resource) => ({ id: resource.id, name: resource.name }))} filters={{ status: statusFilter, resource: resourceFilter, date: dateFilter }} pagination={{ page, total, totalPages, previousHref: page > 1 ? listQuery(page - 1) : null, nextHref: page < totalPages ? listQuery(page + 1) : null }} /></section>}</div>;
}
