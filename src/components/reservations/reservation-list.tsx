"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDialogFocus } from "@/components/ui/use-dialog-focus";
import { ReservationManagementActions } from "./reservation-management-actions";
import { reservationSituationLabels, reservationSituation, type ReservationMode, type ReservationStatus } from "@/lib/reservations/reservation-presenters";
import { cancelReservationsBatch } from "@/lib/reservations/reservation-management-actions";

export type ReservationListRow = { id: string; resourceName: string; reservationMode: ReservationMode; unitCode: string; requesterName: string; date: string; schedule: string; status: ReservationStatus; endsAt?: string; canCancel?: boolean; notes?: string | null; usageFee?: number | null; requestedAt?: string; history?: Array<{ event: string; at: string; responsible?: string | null; reason?: string | null }> };

export function filterReservations(rows: ReservationListRow[], status: string, resource: string, date: string) {
  return rows.filter((row) => (!status || reservationSituation(row.status, row.endsAt || "") === status) && (!resource || row.resourceName === resource) && (!date || row.date === date));
}

export function eligibleReservationIds(rows: ReservationListRow[]) {
  return rows.filter((row) => row.canCancel === true && ["pending", "approved"].includes(row.status) && reservationSituation(row.status, row.endsAt) !== "completed").map((row) => row.id);
}

export function pruneReservationSelection(selected: string[], visibleEligibleIds: string[]) {
  const allowed = new Set(visibleEligibleIds);
  return selected.filter((id) => allowed.has(id));
}

function reservationBadgeVariant(situation: string) {
  if (situation === "completed" || situation === "approved") return "success" as const;
  if (situation === "pending") return "warning" as const;
  if (situation === "rejected" || situation === "cancelled") return "danger" as const;
  return "neutral" as const;
}

export function ReservationList({ rows }: { rows: ReservationListRow[] }) {
  const [status, setStatus] = useState(""); const [resource, setResource] = useState(""); const [date, setDate] = useState("");
  const resources = [...new Set(rows.map((row) => row.resourceName))].sort(); const filtered = useMemo(() => filterReservations(rows, status, resource, date), [rows, status, resource, date]);
  const [selected, setSelected] = useState<ReservationListRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const router = useRouter();
  const selectAllRef = useRef<HTMLInputElement>(null);
  const bulkDialogRef = useDialogFocus<HTMLElement>(bulkOpen, () => setBulkOpen(false));
  const eligibleIds = useMemo(() => eligibleReservationIds(filtered), [filtered]);
  const selectedVisibleIds = useMemo(() => pruneReservationSelection(selectedIds, eligibleIds), [selectedIds, eligibleIds]);
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedVisibleIds.includes(id));
  useEffect(() => { if (selectedVisibleIds.length !== selectedIds.length) setSelectedIds(selectedVisibleIds); }, [selectedIds.length, selectedVisibleIds]);
  useEffect(() => { if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisibleIds.length > 0 && !allEligibleSelected; }, [selectedVisibleIds.length, allEligibleSelected]);
  const toggleReservation = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = () => setSelectedIds(allEligibleSelected ? [] : eligibleIds);
  const submitBulkCancellation = async () => {
    if (bulkSubmitting || !bulkReason.trim()) return;
    setBulkSubmitting(true); setBulkMessage(null);
    const result = await cancelReservationsBatch(selectedVisibleIds, bulkReason);
    setBulkSubmitting(false); setBulkOpen(false); setBulkReason(""); setSelectedIds([]);
    setBulkMessage(`${result.cancelled} cancelada(s), ${result.ignored} ignorada(s) e ${result.failures.length} falha(s).`);
    router.refresh();
  };
  const detailsTitleId = useId();
  const detailsDialogRef = useDialogFocus<HTMLElement>(Boolean(selected), () => setSelected(null));
  return <><div className="cv-filters cv-reservation-filters"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{Object.entries(reservationSituationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Recurso<select value={resource} onChange={(event) => setResource(event.target.value)}><option value="">Todos</option>{resources.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>{bulkMessage && <p className="cv-bulk-message" role="status">{bulkMessage}</p>}{selectedVisibleIds.length > 0 && <div className="cv-bulk-actions" role="region" aria-label="Ações em lote"><strong>{selectedVisibleIds.length} selecionada(s)</strong><Button variant="destructive" size="compact" type="button" onClick={() => setBulkOpen(true)}>Cancelar selecionadas</Button><Button variant="secondary" size="compact" type="button" onClick={() => setSelectedIds([])}>Limpar seleção</Button></div>}<div className="cv-table-wrap cv-reservation-table"><table className="cv-table"><thead><tr><th><input ref={selectAllRef} type="checkbox" checked={allEligibleSelected} onChange={toggleAll} disabled={!eligibleIds.length} aria-label="Selecionar todas as reservas elegíveis visíveis" /></th><th>Recurso</th><th>Unidade</th><th>Solicitante</th><th>Data/Horário</th><th>Status</th><th className="cv-reservation-actions-header">Ações</th></tr></thead><tbody>{filtered.map((row) => { const situation = reservationSituation(row.status, row.endsAt); const eligible = eligibleIds.includes(row.id); return <tr key={row.id}><td><input type="checkbox" checked={selectedVisibleIds.includes(row.id)} onChange={() => toggleReservation(row.id)} disabled={!eligible} aria-label={`Selecionar reserva de ${row.resourceName}, ${row.date}`} /></td><td>{row.resourceName}</td><td>{row.unitCode}</td><td>{row.requesterName}</td><td>{row.date.split("-").reverse().join("/")}<br /><small>{row.schedule}</small></td><td><StatusBadge variant={reservationBadgeVariant(situation)}>{reservationSituationLabels[situation]}</StatusBadge></td><td className="cv-reservation-actions-cell"><div className="cv-reservation-action-row"><Button variant="secondary" size="compact" type="button" onClick={() => setSelected(row)}>Detalhes</Button>{situation !== "completed" && <ReservationManagementActions id={row.id} status={row.status} />}</div></td></tr>;})}</tbody></table>{!filtered.length && <p className="cv-muted">Nenhuma reserva encontrada para os filtros selecionados.</p>}</div><div className="cv-reservation-cards">{filtered.map((row) => { const situation = reservationSituation(row.status, row.endsAt); const eligible = eligibleIds.includes(row.id); return <article className="cv-panel" key={row.id}><label className="cv-reservation-select"><input type="checkbox" checked={selectedVisibleIds.includes(row.id)} onChange={() => toggleReservation(row.id)} disabled={!eligible} aria-label={`Selecionar reserva de ${row.resourceName}, ${row.date}`} /> Selecionar</label><strong>{row.resourceName}</strong><span>{row.unitCode} · {row.requesterName}</span><span>{row.date.split("-").reverse().join("/")} · {row.schedule}</span><StatusBadge variant={reservationBadgeVariant(situation)}>{reservationSituationLabels[situation]}</StatusBadge><div className="cv-reservation-action-row"><Button variant="secondary" size="compact" type="button" onClick={() => setSelected(row)}>Detalhes</Button>{situation !== "completed" && <ReservationManagementActions id={row.id} status={row.status} />}</div></article>;})}</div>{bulkOpen && <div className="cv-feedback-overlay"><section ref={bulkDialogRef} className="cv-feedback-modal cv-bulk-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-cancel-title"><Button variant="icon" className="cv-feedback-close" type="button" onClick={() => setBulkOpen(false)} aria-label="Fechar">×</Button><h2 id="bulk-cancel-title">Cancelar reservas selecionadas</h2><p>{selectedVisibleIds.length} reserva(s) serão processadas individualmente. Reservas que já não forem elegíveis serão ignoradas.</p><label className="cv-rejection-field">Motivo obrigatório<textarea value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} required aria-label="Motivo do cancelamento" /></label><div className="cv-reservation-action-row"><Button variant="secondary" type="button" onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>Voltar</Button><Button variant="destructive" type="button" onClick={submitBulkCancellation} disabled={bulkSubmitting || !bulkReason.trim()}>{bulkSubmitting ? "Cancelando…" : "Confirmar cancelamento"}</Button></div></section></div>}{selected && <div className="cv-feedback-overlay"><section ref={detailsDialogRef} className="cv-feedback-modal" role="dialog" aria-modal="true" aria-labelledby={detailsTitleId}><Button variant="icon" className="cv-feedback-close" type="button" onClick={() => setSelected(null)} aria-label="Fechar">×</Button><h2 id={detailsTitleId}>Detalhes da reserva</h2><p><strong>Recurso:</strong> {selected.resourceName}</p><p><strong>Unidade:</strong> {selected.unitCode}</p><p><strong>Solicitante:</strong> {selected.requesterName}</p><p><strong>Data:</strong> {selected.date.split("-").reverse().join("/")} · {selected.schedule}</p><p><strong>Status/Situação:</strong> {reservationSituationLabels[reservationSituation(selected.status, selected.endsAt)]}</p>{selected.requestedAt && <p><strong>Data da solicitação:</strong> {new Date(selected.requestedAt).toLocaleString("pt-BR")}</p>}{selected.notes && <p><strong>Observações:</strong> {selected.notes}</p>}<p><strong>Valor da reserva:</strong> {selected.usageFee && selected.usageFee > 0 ? `R$ ${selected.usageFee.toFixed(2).replace(".", ",")}` : "Sem cobrança"}</p><h3>Histórico</h3>{selected.history?.map((event, index) => <p key={`${event.at}-${index}`}><strong>{new Date(event.at).toLocaleString("pt-BR")}</strong><br />{event.event}{event.responsible ? ` — ${event.responsible}` : ""}{event.reason ? `: ${event.reason}` : ""}</p>)}</section></div>}</>;
}
