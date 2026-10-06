"use client";

import { useState } from "react";
import { manageReservation } from "@/lib/reservations/reservation-management-actions";

export function ReservationManagementActions({ id, status }: { id: string; status: string }) {
  const [action, setAction] = useState<string | null>(null); const [reason, setReason] = useState(""); const [message, setMessage] = useState("");
  const submit = async () => { const data = new FormData(); data.set("reservation_id", id); data.set("action", action || ""); data.set("reason", reason); const result = await manageReservation(data); if (result.success) window.location.reload(); else setMessage(result.error || "Não foi possível atualizar a reserva."); };
  if (!(["pending", "approved"].includes(status))) return null;
  return <><div className="cv-reservation-actions"><button className="button button-outline" type="button" onClick={() => setAction("cancel")}>Cancelar</button>{status === "pending" && <><button className="button button-primary" type="button" onClick={() => setAction("approve")}>Aprovar</button><button className="button button-outline" type="button" onClick={() => setAction("reject")}>Rejeitar</button></>}</div>{action && <div className="cv-feedback-overlay"><section className="cv-feedback-modal" role="dialog" aria-modal="true"><h2>{action === "approve" ? "Aprovar reserva?" : action === "reject" ? "Rejeitar reserva?" : "Cancelar reserva?"}</h2>{action === "reject" && <textarea autoFocus placeholder="Motivo da rejeição *" value={reason} onChange={(event) => setReason(event.target.value)} required />}{message && <p className="cv-alert cv-alert-error">{message}</p>}<div className="cv-resource-actions"><button className="button button-outline" type="button" onClick={() => setAction(null)}>Cancelar</button><button className="button button-primary" type="button" disabled={action === "reject" && !reason.trim()} onClick={submit}>{action === "approve" ? "Aprovar reserva" : action === "reject" ? "Rejeitar reserva" : "Cancelar reserva"}</button></div></section></div>}</>;
}
