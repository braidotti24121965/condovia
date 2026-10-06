"use client";

import { CheckCircle2, TriangleAlert, X } from "lucide-react";

export function ReservationFeedbackModal({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  const success = type === "success";
  return <div className="cv-feedback-overlay" role="presentation"><section className={`cv-feedback-modal ${success ? "cv-feedback-success" : "cv-feedback-error"}`} role="dialog" aria-modal="true" aria-labelledby="reservation-feedback-title"><button className="cv-feedback-close" type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button><span className="cv-feedback-icon">{success ? <CheckCircle2 size={28} /> : <TriangleAlert size={28} />}</span><h2 id="reservation-feedback-title">{success ? "Reserva solicitada" : "Reserva não realizada"}</h2><p>{message}</p><button className="button button-primary" type="button" onClick={onClose}>Entendi</button></section></div>;
}
