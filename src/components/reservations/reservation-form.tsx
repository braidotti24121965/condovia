"use client";

import { useState } from "react";
import { createReservation } from "@/lib/reservations/reservation-actions";
import { ReservationFeedbackModal } from "./reservation-feedback-modal";

export function ReservationForm({ resources, units }: { resources: Array<{ id: string; name: string }>; units: Array<{ id: string; code: string; display_name: string | null }> }) {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string; reload?: boolean } | null>(null); const [loading, setLoading] = useState(false);
  const closeFeedback = () => { const reload = feedback?.reload; setFeedback(null); if (reload) window.location.reload(); };
  return <>{<form action={async (form) => { setLoading(true); const result = await createReservation(form); setFeedback(result.success ? { type: "success", reload: true, message: result.requiresApproval ? "Sua solicitação de reserva foi registrada com sucesso. A reserva está aguardando aprovação." : "Sua solicitação de reserva foi registrada com sucesso." } : { type: "error", message: result.error || "Não foi possível criar a reserva." }); setLoading(false); }} className="cv-form cv-reservation-form">
    <div className="cv-form-grid cv-reservation-fields"><label className="cv-reservation-resource">Recurso *<select name="resource_id" required><option value="">Selecione</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label><label className="cv-reservation-unit">Unidade *<select name="unit_id" required><option value="">Selecione</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code}{unit.display_name ? ` · ${unit.display_name}` : ""}</option>)}</select></label><label className="cv-reservation-start">Início *<input name="starts_at" type="datetime-local" required /></label><label className="cv-reservation-end">Fim *<input name="ends_at" type="datetime-local" required /></label><label className="cv-reservation-notes">Observações<textarea name="notes" /></label></div>
    <div className="cv-resource-actions"><button className="button button-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : "Solicitar reserva"}</button></div>
  </form>}{feedback && <ReservationFeedbackModal type={feedback.type} message={feedback.message} onClose={closeFeedback} />}</>;
}
