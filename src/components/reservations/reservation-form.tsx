"use client";

import { useState } from "react";
import { createReservation } from "@/lib/reservations/reservation-actions";
import { ReservationFeedbackModal } from "./reservation-feedback-modal";
import { ReservationAvailability } from "./reservation-availability";

type Resource = { id: string; name: string; reservation_mode: "day" | "time_slot"; minimum_advance_minutes: number; maximum_advance_minutes: number | null; minimum_duration_minutes: number; maximum_duration_minutes: number | null; buffer_minutes: number; hours: Array<{ weekday: number; start_time: string; end_time: string }> };
type OccupiedReservation = { starts_at: string; ends_at: string; own: boolean };

export function ReservationForm({ resources, units, reservations, timeZone }: { resources: Resource[]; units: Array<{ id: string; code: string; display_name: string | null }>; reservations: OccupiedReservation[]; timeZone: string }) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string; reload?: boolean } | null>(null); const [loading, setLoading] = useState(false); const [resourceId, setResourceId] = useState(""); const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [showAvailability, setShowAvailability] = useState(false);
  const selectedResource = resources.find((resource) => resource.id === resourceId) || null;
  const closeFeedback = () => { const reload = feedback?.reload; setFeedback(null); if (reload) window.location.reload(); };
  return <>{<form action={async (form) => { setLoading(true); const result = await createReservation(form); setFeedback(result.success ? { type: "success", reload: true, message: result.requiresApproval ? "Sua solicitação de reserva foi registrada com sucesso. A reserva está aguardando aprovação." : "Sua solicitação de reserva foi registrada com sucesso." } : { type: "error", message: result.error || "Não foi possível criar a reserva." }); setLoading(false); }} className="cv-form cv-reservation-form">
    <div className="cv-form-grid cv-reservation-fields"><label className="cv-reservation-resource">Recurso *<select name="resource_id" value={resourceId} onChange={(event) => { setResourceId(event.target.value); setStart(""); setEnd(""); }} required><option value="">Selecione</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label><label className="cv-reservation-unit">Unidade *<select name="unit_id" required><option value="">Selecione</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code}{unit.display_name ? ` · ${unit.display_name}` : ""}</option>)}</select></label>{selectedResource?.reservation_mode === "day" ? <label className="cv-reservation-start">Data *<input name="reservation_date" type="date" value={start} onChange={(event) => setStart(event.target.value)} required /></label> : <><label className="cv-reservation-start">Início *<input name="starts_at" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required /></label><label className="cv-reservation-end">Fim *<input name="ends_at" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} required /></label></>}<label className="cv-reservation-notes">Observações<textarea name="notes" /></label></div>
    {selectedResource && <button className="button button-outline cv-availability-toggle" type="button" onClick={() => setShowAvailability((visible) => !visible)}>{showAvailability ? "Ocultar disponibilidade" : "Ver disponibilidade"}</button>}
    {selectedResource && showAvailability && <ReservationAvailability resource={selectedResource} timeZone={timeZone} reservations={reservations} onSelect={(nextStart, nextEnd) => { setStart(nextStart); setEnd(nextEnd); }} />}
    <div className="cv-resource-actions"><button className="button button-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : "Solicitar reserva"}</button></div>
  </form>}{feedback && <ReservationFeedbackModal type={feedback.type} message={feedback.message} onClose={closeFeedback} />}</>;
}
