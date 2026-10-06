"use client";

import { useEffect, useMemo, useState } from "react";
import { parseDateTimeInTimezone } from "@/lib/gatehouse/timezone";

type Resource = {
  id: string;
  name: string;
  reservation_mode: "day" | "time_slot";
  minimum_advance_minutes: number;
  maximum_advance_minutes: number | null;
  minimum_duration_minutes: number;
  maximum_duration_minutes: number | null;
  buffer_minutes: number;
  hours: Array<{ weekday: number; start_time: string; end_time: string }>;
};

type OccupiedReservation = { resource_id: string; starts_at: string; ends_at: string; own: boolean };
type ResourceBlock = { start_at: string; end_at: string; status: string };

export function isSlotWithinAdvanceWindow(start: Date, end: Date, minimumAdvanceMinutes: number, maximumAdvanceMinutes: number | null, now = new Date()) {
  const minimumAt = now.getTime() + minimumAdvanceMinutes * 60000;
  const maximumAt = maximumAdvanceMinutes == null ? Number.POSITIVE_INFINITY : now.getTime() + maximumAdvanceMinutes * 60000;
  return start.getTime() >= minimumAt && end.getTime() <= maximumAt;
}

export function getTimeSlotStepMinutes(minimumDurationMinutes: number) {
  return Math.max(1, minimumDurationMinutes);
}

export function filterReservationsForResource(reservations: OccupiedReservation[], resourceId: string) {
  return reservations.filter((reservation) => reservation.resource_id === resourceId);
}

export function ReservationAvailability({ resource, timeZone, reservations, blocks = [], selectedDate: selectedDateProp = "", onSelect, onDateChange }: { resource: Resource | null; timeZone: string; reservations: OccupiedReservation[]; blocks?: ResourceBlock[]; selectedDate?: string; onSelect: (start: string, end: string) => void; onDateChange?: (date: string) => void }) {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const days = useMemo(() => {
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const leading = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const values = Array.from({ length: count }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
      return { day: index + 1, date: `${monthKey}-${String(index + 1).padStart(2, "0")}`, weekday: date.getDay() };
    });
    return [...Array.from({ length: leading }, () => null), ...values];
  }, [month, monthKey]);
  const dayHours = resource && selectedDate ? resource.hours.filter((hour) => hour.weekday === new Date(`${selectedDate}T00:00:00Z`).getUTCDay()) : [];
  const resourceReservations = filterReservationsForResource(reservations, resource?.id || "");
  const dayReservations = selectedDate ? resourceReservations.filter((reservation) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(reservation.starts_at)) === selectedDate) : [];
  const slots = dayHours.flatMap((hour) => {
    const result: Array<{ start: string; end: string; occupied: OccupiedReservation | null }> = [];
    const start = Number(hour.start_time.slice(0, 2)) * 60 + Number(hour.start_time.slice(3, 5));
    const end = Number(hour.end_time.slice(0, 2)) * 60 + Number(hour.end_time.slice(3, 5));
    for (let minute = start; minute + resource!.minimum_duration_minutes <= end; minute += getTimeSlotStepMinutes(resource!.minimum_duration_minutes)) {
      const startLocal = `${selectedDate}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const endMinute = minute + resource!.minimum_duration_minutes;
      const endLocal = `${selectedDate}T${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
      const startDate = parseDateTimeInTimezone(startLocal, timeZone);
      const endDate = parseDateTimeInTimezone(endLocal, timeZone);
      const occupied = dayReservations.find((reservation) => new Date(reservation.starts_at) < new Date(endDate.getTime() + resource!.buffer_minutes * 60000) && new Date(reservation.ends_at).getTime() + resource!.buffer_minutes * 60000 > startDate.getTime()) || (blocks.some((block) => new Date(block.start_at) < endDate && new Date(block.end_at) > startDate) ? { resource_id: resource!.id, starts_at: "", ends_at: "", own: false } : null);
      const validAdvance = isSlotWithinAdvanceWindow(startDate, endDate, resource!.minimum_advance_minutes, resource!.maximum_advance_minutes);
      result.push({ start: startLocal, end: endLocal, occupied: validAdvance ? occupied : { resource_id: resource!.id, starts_at: "", ends_at: "", own: false } });
    }
    return result;
  });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  const reservationDates = new Map<string, OccupiedReservation[]>();
  resourceReservations.forEach((reservation) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(reservation.starts_at));
    reservationDates.set(date, [...(reservationDates.get(date) || []), reservation]);
  });
  const dateHasValidSlot = (date: string, weekday: number) => {
    if (!resource) return false;
    return resource.hours.some((hour) => {
    if (hour.weekday !== weekday) return false;
    const start = Number(hour.start_time.slice(0, 2)) * 60 + Number(hour.start_time.slice(3, 5));
    const end = Number(hour.end_time.slice(0, 2)) * 60 + Number(hour.end_time.slice(3, 5));
    for (let minute = start; minute + resource.minimum_duration_minutes <= end; minute += getTimeSlotStepMinutes(resource.minimum_duration_minutes)) {
      const startLocal = `${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
      const endMinute = minute + resource.minimum_duration_minutes;
      const endLocal = `${date}T${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
      const startDate = parseDateTimeInTimezone(startLocal, timeZone);
      const endDate = parseDateTimeInTimezone(endLocal, timeZone);
      if (!isSlotWithinAdvanceWindow(startDate, endDate, resource.minimum_advance_minutes, resource.maximum_advance_minutes)) continue;
      if (resource.maximum_duration_minutes != null && resource.minimum_duration_minutes > resource.maximum_duration_minutes) continue;
      const occupied = (reservationDates.get(date) || []).some((reservation) => new Date(reservation.starts_at) < new Date(endDate.getTime() + resource.buffer_minutes * 60000) && new Date(reservation.ends_at).getTime() + resource.buffer_minutes * 60000 > startDate.getTime()) || blocks.some((block) => new Date(block.start_at) < endDate && new Date(block.end_at) > startDate);
      if (!occupied) return true;
    }
    return false;
    });
  };
  const dateHasValidDay = (date: string, weekday: number) => {
    if (!resource) return false;
    const hour = resource.hours.find((item) => item.weekday === weekday);
    if (!hour) return false;
    const startDate = parseDateTimeInTimezone(`${date}T${hour.start_time.slice(0, 5)}`, timeZone);
    const endDate = parseDateTimeInTimezone(`${date}T${hour.end_time.slice(0, 5)}`, timeZone);
    const advance = Math.round((startDate.getTime() - Date.now()) / 60000);
    if (advance < resource.minimum_advance_minutes || (resource.maximum_advance_minutes != null && advance > resource.maximum_advance_minutes)) return false;
    return !(reservationDates.get(date) || []).some((reservation) => new Date(reservation.starts_at) < endDate && new Date(reservation.ends_at) > startDate) && !blocks.some((block) => new Date(block.start_at) < endDate && new Date(block.end_at) > startDate);
  };
  const isDay = resource?.reservation_mode === "day";
  const isAvailable = (date: string, weekday: number) => isDay ? dateHasValidDay(date, weekday) : dateHasValidSlot(date, weekday);
  useEffect(() => {
    setSelectedDate(selectedDateProp);
    setSelectedSlot("");
    if (isDay && selectedDateProp) {
      const date = new Date(`${selectedDateProp}T00:00:00Z`);
      if (Number.isNaN(date.getTime()) || !isAvailable(selectedDateProp, date.getUTCDay())) onDateChange?.("");
    }
  // The availability predicate is derived from the current resource snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDay, onDateChange, selectedDateProp]);
  if (!resource) return null;
  return <section className="cv-availability-panel" aria-label="Disponibilidade do recurso"><div className="cv-availability-heading"><div><span className="cv-availability-overline">Disponibilidade</span><strong>{resource.name}</strong></div><div className="cv-availability-month"><button className="button button-outline" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Mês anterior">‹</button><span>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month)}</span><button className="button button-outline" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Próximo mês">›</button></div></div><div className="cv-availability-weekdays" aria-hidden="true">{["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((label) => <span key={label}>{label}</span>)}</div><div className="cv-availability-days">{days.map((day, index) => day ? <button key={day.date} className={`cv-availability-day ${selectedDate === day.date ? "is-selected" : ""} ${today === day.date ? "is-today" : ""} ${reservationDates.has(day.date) ? "has-reservation" : ""} ${isAvailable(day.date, day.weekday) ? "is-available" : "is-unavailable"}`} type="button" disabled={!isAvailable(day.date, day.weekday)} onClick={() => { setSelectedDate(day.date); if (isDay) onDateChange?.(day.date); }} aria-label={`${day.day}${today === day.date ? " Hoje" : ""}${isAvailable(day.date, day.weekday) ? " Disponível" : " Indisponível"}`}>{day.day}</button> : <span className="cv-availability-day cv-availability-empty" key={`empty-${index}`} aria-hidden="true" />)}</div><div className="cv-availability-legend"><span><i className="is-available" />Disponível</span><span><i className="is-occupied" />Ocupado</span><span><i className="is-own" />Sua reserva</span><span><i className="is-unavailable" />Indisponível</span></div>{selectedDate && (isDay ? <p className="cv-muted">Dia inteiro selecionado conforme o período operacional do recurso.</p> : <div className="cv-availability-slots"><strong className="cv-availability-date">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone }).format(new Date(`${selectedDate}T12:00:00`))}</strong>{slots.length ? slots.map((slot) => <button key={slot.start} className={`cv-availability-slot ${selectedSlot === slot.start ? "is-selected" : ""} ${slot.occupied ? slot.occupied.own ? "is-own" : "is-occupied" : "is-available"}`} type="button" disabled={Boolean(slot.occupied)} onClick={() => { setSelectedSlot(slot.start); onSelect(slot.start, slot.end); }} aria-label={`${slot.start.slice(11)} até ${slot.end.slice(11)}${slot.occupied ? slot.occupied.own ? " Sua reserva" : " Ocupado" : " Disponível"}`}><span className="cv-availability-slot-start">{slot.start.slice(11)}</span><span className="cv-availability-slot-end">até {slot.end.slice(11)}</span>{slot.occupied && <span className="cv-availability-slot-state">{slot.occupied.own ? "Sua reserva" : "Ocupado"}</span>}</button>) : <p className="cv-muted">Sem horários configurados para este dia.</p>}</div>)}</section>;
}
