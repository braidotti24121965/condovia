"use client";

import { useState } from "react";
import { manageReservation } from "@/lib/reservations/reservation-management-actions";
import { reservationSituation, reservationSituationLabels } from "@/lib/reservations/reservation-presenters";
import type { ReservationListRow } from "./reservation-list";

export function MyReservations({ rows }: { rows: ReservationListRow[] }) {
  const [selected, setSelected] = useState<ReservationListRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ReservationListRow | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const upcoming = rows.filter((row) => ["pending", "approved"].includes(reservationSituation(row.status, row.endsAt)));
  const history = rows.filter((row) => !["pending", "approved"].includes(reservationSituation(row.status, row.endsAt)));
  const cancel = async () => {
    if (!cancelTarget) return;
    setLoading(true); setMessage("");
    const form = new FormData(); form.set("reservation_id", cancelTarget.id); form.set("action", "cancel");
    const result = await manageReservation(form);
    setLoading(false);
    if (result.success) window.location.reload(); else { setMessage(result.error || "Não foi possível cancelar a reserva."); setCancelTarget(null); }
  };
  const section = (title: string, sectionRows: ReservationListRow[]) => <section className="cv-panel cv-my-reservations-section"><h3>{title}</h3>{sectionRows.length ? <div className="cv-my-reservations-list">{sectionRows.map((row) => { const situation = reservationSituation(row.status, row.endsAt); return <article className="cv-my-reservation-row" key={row.id}><div><strong>{row.resourceName}</strong><span>{row.unitCode} · {row.date.split("-").reverse().join("/")} · {row.schedule}</span></div><span className={`cv-reservation-badge cv-reservation-${situation}`}>{reservationSituationLabels[situation]}</span><div className="cv-reservation-action-row"><button className="button button-outline" type="button" onClick={() => setSelected(row)}>Detalhes</button>{row.canCancel && <button className="button button-outline" type="button" onClick={() => setCancelTarget(row)}>Cancelar</button>}</div></article>;})}</div> : <p className="cv-muted">Nenhuma reserva nesta seção.</p>}</section>;
  return <section className="cv-panel"><h2>Minhas reservas</h2>{message && <p className="cv-alert cv-alert-error">{message}</p>}{section("Próximas", upcoming)}{section("Histórico", history)}{selected && <div className="cv-feedback-overlay"><section className="cv-feedback-modal" role="dialog" aria-modal="true"><button className="cv-feedback-close" type="button" onClick={() => setSelected(null)} aria-label="Fechar">×</button><h2>Detalhes da reserva</h2><p><strong>Recurso:</strong> {selected.resourceName}</p><p><strong>Unidade:</strong> {selected.unitCode}</p><p><strong>Data/período:</strong> {selected.date.split("-").reverse().join("/")} · {selected.schedule}</p><p><strong>Situação:</strong> {reservationSituationLabels[reservationSituation(selected.status, selected.endsAt)]}</p>{selected.requestedAt && <p><strong>Data da solicitação:</strong> {new Date(selected.requestedAt).toLocaleString("pt-BR")}</p>}{selected.usageFee != null && <p><strong>Valor:</strong> {selected.usageFee > 0 ? `R$ ${selected.usageFee.toFixed(2).replace(".", ",")}` : "Sem cobrança"}</p>}{selected.notes && <p><strong>Observações:</strong> {selected.notes}</p>}<h3>Histórico</h3>{selected.history?.map((event, index) => <p key={`${event.at}-${index}`}><strong>{new Date(event.at).toLocaleString("pt-BR")}</strong><br />{event.event}{event.reason ? `: ${event.reason}` : ""}</p>)}</section></div>}{cancelTarget && <div className="cv-feedback-overlay"><section className="cv-feedback-modal cv-feedback-error" role="dialog" aria-modal="true"><h2>Cancelar reserva?</h2><p>Tem certeza de que deseja cancelar esta reserva?</p><p><strong>{cancelTarget.resourceName}</strong><br />{cancelTarget.date.split("-").reverse().join("/")} · {cancelTarget.schedule}</p><div className="cv-resource-actions"><button className="button button-outline" type="button" onClick={() => setCancelTarget(null)} disabled={loading}>Voltar</button><button className="button cv-button-danger" type="button" onClick={cancel} disabled={loading}>{loading ? "Cancelando..." : "Cancelar reserva"}</button></div></section></div>}</section>;
}
