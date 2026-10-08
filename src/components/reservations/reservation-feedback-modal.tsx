"use client";

import { CheckCircle2, TriangleAlert, X } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

export function ReservationFeedbackModal({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  const success = type === "success";
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLElement>(true, onClose);
  return <div className="cv-feedback-overlay" role="presentation"><section ref={dialogRef} className={`cv-feedback-modal ${success ? "cv-feedback-success" : "cv-feedback-error"}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><Button variant="icon" className="cv-feedback-close" type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></Button><span className="cv-feedback-icon">{success ? <CheckCircle2 size={28} /> : <TriangleAlert size={28} />}</span><h2 id={titleId}>{success ? "Reserva solicitada" : "Reserva não realizada"}</h2><p>{message}</p><Button variant="secondary" type="button" onClick={onClose}>Entendi</Button></section></div>;
}
