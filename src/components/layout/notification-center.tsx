"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { startTransition, useCallback, useEffect, useId, useRef, useState } from "react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/notifications/notification-actions";
import type { NotificationItem } from "@/lib/notifications/notification-types";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { Button } from "@/components/ui/button";

export function unreadNotificationCount(items: NotificationItem[]) { return items.filter((item) => !item.read_at).length; }

export const NOTIFICATION_POLL_INTERVAL_MS = 5000;

export function canPollNotifications(visibilityState: DocumentVisibilityState, inFlight: boolean) {
  return visibilityState === "visible" && !inFlight;
}

export function refreshReservationView(refresh: () => void, transition: (callback: () => void) => void = startTransition) {
  transition(refresh);
}

export function mergeNotificationInsert(items: NotificationItem[], notification: NotificationItem) {
  return items.some((item) => item.id === notification.id) ? items : [notification, ...items].slice(0, 25);
}

export function mergeNotificationUpdate(items: NotificationItem[], notification: NotificationItem) {
  return items.map((item) => item.id === notification.id ? { ...item, ...notification } : item);
}

export function isReservationNotification(notification: NotificationItem) {
  return notification.entity_type === "reservation" && ["reservation_requested", "reservation_approved", "reservation_rejected", "reservation_cancelled"].includes(notification.notification_type);
}

export function mergePolledNotifications(current: NotificationItem[], incoming: NotificationItem[]) {
  const currentById = new Map(current.map((notification) => [notification.id, notification]));
  return incoming.slice(0, 25).map((notification) => ({ ...notification, read_at: currentById.get(notification.id)?.read_at ?? notification.read_at }));
}

export function hasNotificationChanges(current: NotificationItem[], incoming: NotificationItem[]) {
  if (current.length !== incoming.length) return true;
  const currentById = new Map(current.map((notification) => [notification.id, notification]));
  return incoming.some((notification) => currentById.get(notification.id)?.read_at !== notification.read_at);
}

export function hasNewReservationNotification(current: NotificationItem[], incoming: NotificationItem[]) {
  const currentIds = new Set(current.map((notification) => notification.id));
  return incoming.some((notification) => !currentIds.has(notification.id) && isReservationNotification(notification));
}

export function NotificationCenter({ initialNotifications, timeZone, condominiumId, userAccountId }: { initialNotifications: NotificationItem[]; timeZone: string; condominiumId?: string; userAccountId?: string }) {
  const [items, setItems] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const itemsRef = useRef(initialNotifications);
  const pollingInFlightRef = useRef(false);
  const pollingActiveRef = useRef(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const popoverId = useId();
  const unread = unreadNotificationCount(items);
  const synchronize = useCallback(async () => {
    if (!canPollNotifications(document.visibilityState, pollingInFlightRef.current)) return;
    pollingInFlightRef.current = true;
    const previous = itemsRef.current;
    try {
      const { notifications } = await getNotifications();
      if (!pollingActiveRef.current) return;
      if (hasNotificationChanges(previous, notifications)) {
        const merged = mergePolledNotifications(previous, notifications);
        itemsRef.current = merged;
        setItems(merged);
      }
      if (hasNewReservationNotification(previous, notifications)) refreshReservationView(() => router.refresh());
    } finally {
      pollingInFlightRef.current = false;
    }
  }, [router]);
  useEffect(() => {
    if (!condominiumId || !userAccountId) return;
    pollingActiveRef.current = true;
    void synchronize();
    const interval = window.setInterval(() => void synchronize(), NOTIFICATION_POLL_INTERVAL_MS);
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") void synchronize(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { pollingActiveRef.current = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, [condominiumId, synchronize, userAccountId]);
  const markOne = async (id: string) => { if (items.find((item) => item.id === id)?.read_at) return; const readAt = new Date().toISOString(); itemsRef.current = itemsRef.current.map((item) => item.id === id ? { ...item, read_at: readAt } : item); setItems(itemsRef.current); await markNotificationAsRead(id); };
  const markAll = async () => { if (!unread || busy) return; setBusy(true); const readAt = new Date().toISOString(); itemsRef.current = itemsRef.current.map((item) => ({ ...item, read_at: item.read_at || readAt })); setItems(itemsRef.current); await markAllNotificationsAsRead(); setBusy(false); };
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus({ preventScroll: true });
    const close = () => {
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "Tab" && popoverRef.current) {
        const focusable = Array.from(popoverRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);
  return <div className="notification-center"><Button ref={triggerRef} variant="icon" className="icon-button notification-button" size="default" type="button" aria-label={unread ? `Notificações, ${unread} não lidas` : "Notificações"} aria-expanded={open} aria-controls={popoverId} onClick={() => setOpen((value) => !value)}><Bell size={19} />{unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}</Button>{open && <section ref={popoverRef} id={popoverId} className="notification-popover" role="dialog" aria-modal="false" aria-labelledby={`${popoverId}-title`}><header><div><h2 id={`${popoverId}-title`}>Notificações</h2><span>{unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Tudo em dia"}</span></div><Button ref={closeButtonRef} variant="icon" size="compact" className="notification-close" type="button" aria-label="Fechar notificações" onClick={() => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true })); }}><X size={16} /></Button></header>{unread > 0 && <Button variant="ghost" className="notification-mark-all" size="compact" type="button" onClick={markAll} disabled={busy}><Check size={14} /> Marcar todas como lidas</Button>}{items.length ? <div className="notification-list">{items.map((item) => <article className={`notification-item ${item.read_at ? "is-read" : "is-unread"}`} key={item.id} role="button" tabIndex={0} aria-label={`Marcar notificação como lida: ${item.title}`} onClick={() => markOne(item.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void markOne(item.id); } }}><div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDateTimeInTimezone(item.created_at, timeZone)}</small></div>{item.entity_type === "reservation" && <Link href="/app/reservations" className="notification-link" aria-label="Abrir reservas" onClick={() => markOne(item.id)}><ExternalLink size={14} /></Link>}</article>)}</div> : <p className="notification-empty">Você não possui notificações.</p>}</section>}</div>;
}
