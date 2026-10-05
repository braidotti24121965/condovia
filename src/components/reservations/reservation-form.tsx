"use client";

import { useState } from "react";
import { createReservation } from "@/lib/reservations/reservation-actions";

export function ReservationForm({ resources, units }: { resources: Array<{ id: string; name: string }>; units: Array<{ id: string; code: string; display_name: string | null }> }) {
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  return <form action={async (form) => { setLoading(true); setError(""); try { await createReservation(form); window.location.reload(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar a reserva."); } finally { setLoading(false); } }} className="cv-form cv-reservation-form">
    {error && <p className="cv-alert cv-alert-error">{error}</p>}
    <div className="cv-form-grid"><label>Recurso *<select name="resource_id" required><option value="">Selecione</option>{resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label><label>Unidade *<select name="unit_id" required><option value="">Selecione</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.code}{unit.display_name ? ` · ${unit.display_name}` : ""}</option>)}</select></label><label>Início *<input name="starts_at" type="datetime-local" required /></label><label>Fim *<input name="ends_at" type="datetime-local" required /></label><label className="cv-form-wide">Observações<textarea name="notes" /></label></div>
    <div className="cv-resource-actions"><button className="button button-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : "Solicitar reserva"}</button></div>
  </form>;
}
