"use client";

import { useState } from "react";
import { saveReservableResource } from "@/lib/reservations/resource-actions";
import { formatCurrencyBRL } from "@/lib/reservations/resource-validation";

const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
type Hour = { weekday: number; start_time: string; end_time: string; active: boolean };
type Unit = "minutes" | "hours" | "days";
const minuteFields = [
  ["minimum_advance", "Antecedência mínima", ["minutes", "hours", "days"]],
  ["maximum_advance", "Antecedência máxima", ["minutes", "hours", "days"]],
  ["minimum_duration", "Duração mínima", ["minutes", "hours"]],
  ["maximum_duration", "Duração máxima", ["minutes", "hours"]],
  ["buffer", "Intervalo entre reservas", ["minutes", "hours"]],
  ["cancellation_deadline", "Prazo para cancelamento", ["minutes", "hours", "days"]],
] as const;

function splitMinutes(raw: unknown, fallback: number, field: string): [number, Unit] {
  const minutes = raw == null || raw === "" ? fallback : Number(raw);
  if (field.includes("advance") || field === "cancellation_deadline") {
    if (minutes % 1440 === 0) return [minutes / 1440, "days"];
    if (minutes % 60 === 0) return [minutes / 60, "hours"];
  } else if (minutes % 60 === 0 && minutes >= 60) return [minutes / 60, "hours"];
  return [minutes, "minutes"];
}

export function ResourceForm({ resource, hours = [] }: { resource?: Record<string, unknown>; hours?: Hour[] }) {
  const [open, setOpen] = useState(Boolean(resource));
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState<Hour[]>(hours);
  const [loading, setLoading] = useState(false);
  const updateDay = (weekday: number, field: "start_time" | "end_time" | "active", value: string | boolean) => setSchedule((current) => {
    const existing = current.find((item) => item.weekday === weekday);
    const next = existing ? { ...existing, [field]: value } : { weekday, start_time: "08:00", end_time: "18:00", active: true, [field]: value };
    return [...current.filter((item) => item.weekday !== weekday), next].sort((a, b) => a.weekday - b.weekday);
  });
  const initialFee = resource?.usage_fee == null ? "" : formatCurrencyBRL(resource.usage_fee);

  return <>
    {!resource && !open && <button className="button button-primary" type="button" onClick={() => setOpen(true)}>Novo recurso reservável</button>}
    {open && <div role="dialog" aria-modal="true" className="cv-modal"><section className="cv-panel cv-resource-panel">
      <h2>{resource ? "Editar recurso" : "Novo recurso reservável"}</h2>
      {error && <p className="cv-alert cv-alert-error">{error}</p>}
      <form action={async (form) => { setLoading(true); setError(""); try { await saveReservableResource(form); setOpen(false); window.location.reload(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar."); } finally { setLoading(false); } }} className="cv-form">
        <section className="cv-form-section"><h3>Dados do recurso</h3><div className="cv-form-grid cv-resource-data-grid">
          <label className="cv-resource-name">Nome *<input name="name" defaultValue={String(resource?.name || "")} required /></label>
          <label className="cv-resource-location">Localização<input name="location" defaultValue={String(resource?.location || "")} /></label>
          <label className="cv-resource-capacity">Capacidade<input name="capacity" type="number" min="1" defaultValue={resource?.capacity == null ? "" : String(resource.capacity)} /></label>
          <label className="cv-resource-status">Status<select name="status" defaultValue={String(resource?.status || "active")}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
          <label className="cv-resource-description">Descrição<textarea name="description" defaultValue={String(resource?.description || "")} /></label>
        </div></section>

        <section className="cv-form-section"><h3>Regras de reserva</h3><p className="cv-form-hint">Informe valores em minutos, horas ou dias. O sistema salva tudo em minutos.</p><div className="cv-resource-rules-grid">
          {minuteFields.map(([key, label, units]) => { const [amount, selected] = splitMinutes(resource?.[`${key}_minutes`], key.includes("duration") ? 30 : 0, key); return <label key={key} className="cv-resource-rule">{label}<span className="cv-resource-unit-field"><input name={`${key}_value`} type="number" min="0" step="1" defaultValue={amount} required={key === "minimum_advance" || key === "minimum_duration"} /><select name={`${key}_unit`} defaultValue={selected}>{units.map((unit) => <option key={unit} value={unit}>{unit === "minutes" ? "minutos" : unit === "hours" ? "horas" : "dias"}</option>)}</select></span></label>; })}
        </div><label className="cv-resource-fee">Valor da reserva (R$)<input name="usage_fee" inputMode="decimal" defaultValue={initialFee} placeholder="R$ 0,00" /></label><div className="cv-resource-checkboxes"><label className="cv-checkbox-label"><input name="requires_approval" type="checkbox" defaultChecked={resource?.requires_approval !== false} /> Exige aprovação</label><label className="cv-checkbox-label"><input name="cancellation_allowed" type="checkbox" defaultChecked={resource?.cancellation_allowed !== false} /> Permite cancelamento</label></div></section>

        <section className="cv-form-section"><h3>Disponibilidade semanal</h3><p className="cv-form-hint">Horários locais do condomínio. Marque os dias em que o recurso estará disponível.</p><div className="cv-resource-schedule" role="table" aria-label="Disponibilidade semanal"><div className="cv-resource-schedule-row cv-resource-schedule-head" role="row"><strong>Dia</strong><strong>Disponível</strong><strong>Início</strong><strong>Fim</strong></div>{weekdays.map((day, weekday) => { const item = schedule.find((entry) => entry.weekday === weekday); const active = Boolean(item?.active); return <div className="cv-resource-schedule-row" key={day} role="row"><span role="cell">{day}</span><label className="cv-checkbox-label" role="cell"><input type="checkbox" checked={active} onChange={(event) => updateDay(weekday, "active", event.target.checked)} /> Disponível</label><input role="cell" aria-label={`${day} início`} type="time" disabled={!active} value={item?.start_time || "08:00"} onChange={(event) => updateDay(weekday, "start_time", event.target.value)} /><input role="cell" aria-label={`${day} fim`} type="time" disabled={!active} value={item?.end_time || "18:00"} onChange={(event) => updateDay(weekday, "end_time", event.target.value)} /></div>; })}</div></section>

        <section className="cv-form-section"><h3>Instruções</h3><label>Instruções de uso<textarea name="instructions" defaultValue={String(resource?.instructions || "")} /></label></section>
        <input type="hidden" name="id" value={String(resource?.id || "")} /><input type="hidden" name="hours" value={JSON.stringify(schedule)} /><div className="cv-resource-actions"><button className="button button-outline" type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="button button-primary" type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button></div>
      </form>
    </section></div>}
  </>;
}
