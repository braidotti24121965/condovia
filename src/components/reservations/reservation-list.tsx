"use client";

import { useMemo, useState } from "react";
import { ReservationManagementActions } from "./reservation-management-actions";
import { reservationStatusLabels, type ReservationMode, type ReservationStatus } from "@/lib/reservations/reservation-presenters";

export type ReservationListRow = { id: string; resourceName: string; reservationMode: ReservationMode; unitCode: string; requesterName: string; date: string; schedule: string; status: ReservationStatus };

export function filterReservations(rows: ReservationListRow[], status: string, resource: string, date: string) {
  return rows.filter((row) => (!status || row.status === status) && (!resource || row.resourceName === resource) && (!date || row.date === date));
}

export function ReservationList({ rows }: { rows: ReservationListRow[] }) {
  const [status, setStatus] = useState(""); const [resource, setResource] = useState(""); const [date, setDate] = useState("");
  const resources = [...new Set(rows.map((row) => row.resourceName))].sort(); const filtered = useMemo(() => filterReservations(rows, status, resource, date), [rows, status, resource, date]);
  return <><div className="cv-filters cv-reservation-filters"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{Object.entries(reservationStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Recurso<select value={resource} onChange={(event) => setResource(event.target.value)}><option value="">Todos</option>{resources.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><label>Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div><div className="cv-table-wrap cv-reservation-table"><table className="cv-table"><thead><tr><th>Recurso</th><th>Unidade</th><th>Solicitante</th><th>Data/Horário</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td>{row.resourceName}</td><td>{row.unitCode}</td><td>{row.requesterName}</td><td>{row.date.split("-").reverse().join("/")}<br /><small>{row.schedule}</small></td><td><span className={`cv-reservation-badge cv-reservation-${row.status}`}>{reservationStatusLabels[row.status]}</span></td><td><ReservationManagementActions id={row.id} status={row.status} /></td></tr>)}</tbody></table>{!filtered.length && <p className="cv-muted">Nenhuma reserva encontrada para os filtros selecionados.</p>}</div><div className="cv-reservation-cards">{filtered.map((row) => <article className="cv-panel" key={row.id}><strong>{row.resourceName}</strong><span>{row.unitCode} · {row.requesterName}</span><span>{row.date.split("-").reverse().join("/")} · {row.schedule}</span><span className={`cv-reservation-badge cv-reservation-${row.status}`}>{reservationStatusLabels[row.status]}</span><ReservationManagementActions id={row.id} status={row.status} /></article>)}</div></>;
}
