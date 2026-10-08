"use client";

import { useId, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { manageReservation } from "@/lib/reservations/reservation-management-actions";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";

export function ReservationManagementActions({ id, status }: { id: string; status: string }) {
  const [action, setAction] = useState<string | null>(null); const [reason, setReason] = useState(""); const [message, setMessage] = useState("");
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLElement>(Boolean(action), () => setAction(null));
  const submit = async () => { const data = new FormData(); data.set("reservation_id", id); data.set("action", action || ""); data.set("reason", reason); const result = await manageReservation(data); if (result.success) window.location.reload(); else setMessage(result.error || "Não foi possível atualizar a reserva."); };
  if (!(["pending", "approved"].includes(status))) return null;
  const isReasonAction = action === "reject" || action === "cancel";
  return <><div className="cv-reservation-actions"><Button variant="destructive" size="compact" type="button" onClick={() => setAction("cancel")}>Cancelar</Button>{status === "pending" && <><Button size="compact" type="button" onClick={() => setAction("approve")}>Aprovar</Button><Button variant="destructive" size="compact" type="button" onClick={() => setAction("reject")}>Rejeitar</Button></>}</div>{action && <div className="cv-feedback-overlay"><section ref={dialogRef} className={`cv-feedback-modal ${isReasonAction ? "cv-rejection-modal cv-feedback-error" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><Button variant="icon" className="cv-feedback-close" type="button" onClick={() => setAction(null)} aria-label="Fechar"><X size={18} /></Button>{isReasonAction && <span className="cv-feedback-icon"><TriangleAlert size={28} /></span>}<h2 id={titleId}>{action === "approve" ? "Aprovar reserva?" : action === "reject" ? "Rejeitar reserva?" : "Cancelar reserva?"}</h2>{isReasonAction && <p className="cv-rejection-description">{action === "reject" ? "Informe o motivo da rejeição. Essa informação ficará registrada no histórico da reserva." : "Informe o motivo do cancelamento. Essa informação ficará registrada no histórico da reserva."}</p>}{isReasonAction && <label className="cv-rejection-field">{action === "reject" ? "Motivo da rejeição" : "Motivo do cancelamento"}<textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} required /></label>}{message && <p className="cv-alert cv-alert-error">{message}</p>}<div className="cv-resource-actions"><Button variant="secondary" type="button" onClick={() => setAction(null)}>Cancelar</Button><Button variant={isReasonAction ? "destructive" : "primary"} type="button" disabled={isReasonAction && !reason.trim()} onClick={submit}>{action === "approve" ? "Aprovar reserva" : action === "reject" ? "Rejeitar reserva" : "Cancelar reserva"}</Button></div></section></div>}</>;
}
