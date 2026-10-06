"use client";

import { useMemo, useState } from "react";
import { parseDateTimeInTimezone } from "@/lib/gatehouse/timezone";

type Resource = {
  id: string;
  name: string;
  minimum_advance_minutes: number;
  maximum_advance_minutes: number | null;
  minimum_duration_minutes: number;
  maximum_duration_minutes: number | null;
  buffer_minutes: number;
  hours: Array<{ weekday: number; start_time: string; end_time: string }>;
};

type OccupiedReservation = { starts_at: string; ends_at: string; own: boolean };

export function ReservationAvailability({ resource, timeZone, reservations, onSelect }: { resource: Resource | null; timeZone: string; reservations: OccupiedReservation[]; onSelect: (start: string, end: string) => void }) {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const days = useMemo(() => {
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
      return { day: index + 1, date: `${monthKey}-${String(index + 1).padStart(2, "0")}`, weekday: date.getDay() };
    });
  }, [month, monthKey]);
  const dayHours = resource && selectedDate ? resource.hours.filter((hour) => hour.weekday === new Date(`${selectedDate}T00:00:00Z`).getUTCDay()) : [];
  const dayReservations = selectedDate ? reservations.filter((reservation) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(reservation.starts_at)) === selectedDate) : [];
  const slots = dayHours.flatMap((hour) => {
    const result: Array<{ start: string; end: string; occupied: OccupiedReservation | null }> = [];
    const start = Number(hour.start_time.slice(0, 2)) * 60 + Number(hour.start_time.slice(3, 5));
    const end = Number(hour.end_time.slice(0, 2)) * 60 + Number(hour.end_time.slice(3, 5));
    for (let minute = start; minute + resource!.minimum_duration_minutes <= end; minute += 30) {
      const startLocal = `${selectedDate}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const endMinute = minute + resource!.minimum_duration_minutes;
      const endLocal = `${selectedDate}T${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
      const startDate = parseDateTimeInTimezone(startLocal, timeZone);
      const endDate = parseDateTimeInTimezone(endLocal, timeZone);
      const occupied = dayReservations.find((reservation) => new Date(reservation.starts_at) < new Date(endDate.getTime() + resource!.buffer_minutes * 60000) && new Date(reservation.ends_at).getTime() + resource!.buffer_minutes * 60000 > startDate.getTime()) || null;
      const advance = Math.round((startDate.getTime() - Date.now()) / 60000);
      const validAdvance = advance >= resource!.minimum_advance_minutes && (resource!.maximum_advance_minutes == null || advance <= resource!.maximum_advance_minutes);
      result.push({ start: startLocal, end: endLocal, occupied: validAdvance ? occupied : { starts_at: "", ends_at: "", own: false } });
    }
    return result;
  });
  if (!resource) return null;
  return <section className="cv-availability-panel" aria-label="Disponibilidade do recurso"><div className="cv-availability-heading"><strong>Disponibilidade · {resource.name}</strong><div><button className="button button-outline" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button><span>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month)}</span><button className="button button-outline" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Próximo mês">›</button></div></div><div className="cv-availability-days">{days.map((day) => <button key={day.date} className={`cv-availability-day ${selectedDate === day.date ? "is-selected" : ""}`} type="button" onClick={() => setSelectedDate(day.date)}>{day.day}</button>)}</div>{selectedDate && <div className="cv-availability-slots"><strong>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone }).format(new Date(`${selectedDate}T12:00:00`))}</strong>{slots.length ? slots.map((slot) => <button key={slot.start} className={`cv-availability-slot ${slot.occupied ? "is-occupied" : "is-available"}`} type="button" disabled={Boolean(slot.occupied)} onClick={() => onSelect(slot.start, slot.end)}>{slot.start.slice(11)}–{slot.end.slice(11)} · {slot.occupied ? slot.occupied.own ? "Sua reserva" : "Ocupado" : "Disponível"}</button>) : <p className="cv-muted">Sem horários configurados para este dia.</p>}</div>}</section>;
}
