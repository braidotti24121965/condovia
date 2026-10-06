"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/notifications/notification-actions";
import type { NotificationItem } from "@/lib/notifications/notification-types";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";

export function unreadNotificationCount(items: NotificationItem[]) { return items.filter((item) => !item.read_at).length; }

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
  const unread = unreadNotificationCount(items);
  const synchronize = useCallback(async () => {
    if (document.visibilityState !== "visible" || pollingInFlightRef.current) return;
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
      if (hasNewReservationNotification(previous, notifications)) router.refresh();
    } finally {
      pollingInFlightRef.current = false;
    }
  }, [router]);
  useEffect(() => {
    if (!condominiumId || !userAccountId) return;
    pollingActiveRef.current = true;
    void synchronize();
    const interval = window.setInterval(() => void synchronize(), 5000);
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") void synchronize(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => { pollingActiveRef.current = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", handleVisibilityChange); };
  }, [condominiumId, synchronize, userAccountId]);
  const markOne = async (id: string) => { if (items.find((item) => item.id === id)?.read_at) return; const readAt = new Date().toISOString(); itemsRef.current = itemsRef.current.map((item) => item.id === id ? { ...item, read_at: readAt } : item); setItems(itemsRef.current); await markNotificationAsRead(id); };
  const markAll = async () => { if (!unread || busy) return; setBusy(true); const readAt = new Date().toISOString(); itemsRef.current = itemsRef.current.map((item) => ({ ...item, read_at: item.read_at || readAt })); setItems(itemsRef.current); await markAllNotificationsAsRead(); setBusy(false); };
  return <div className="notification-center"><button className="icon-button notification-button" type="button" aria-label={unread ? `Notificações, ${unread} não lidas` : "Notificações"} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={19} />{unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}</button>{open && <section className="notification-popover" aria-label="Notificações"><header><div><h2>Notificações</h2><span>{unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Tudo em dia"}</span></div><button className="notification-close" type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}><X size={16} /></button></header>{unread > 0 && <button className="notification-mark-all" type="button" onClick={markAll} disabled={busy}><Check size={14} /> Marcar todas como lidas</button>}{items.length ? <div className="notification-list">{items.map((item) => <article className={`notification-item ${item.read_at ? "is-read" : "is-unread"}`} key={item.id} onClick={() => markOne(item.id)}><div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDateTimeInTimezone(item.created_at, timeZone)}</small></div>{item.entity_type === "reservation" && <Link href="/app/reservations" className="notification-link" aria-label="Abrir reservas" onClick={() => markOne(item.id)}><ExternalLink size={14} /></Link>}</article>)}</div> : <p className="notification-empty">Você não possui notificações.</p>}</section>}</div>;
}
