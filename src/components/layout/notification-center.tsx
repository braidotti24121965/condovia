"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/notifications/notification-actions";
import type { NotificationItem } from "@/lib/notifications/notification-types";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { createClient } from "@/lib/supabase/browser";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function unreadNotificationCount(items: NotificationItem[]) { return items.filter((item) => !item.read_at).length; }

export function notificationRealtimeFilter(userAccountId: string) { return `recipient_user_account_id=eq.${userAccountId}`; }

type RealtimeNotification = NotificationItem & { condominium_id?: string; recipient_user_account_id?: string };

export function mergeNotificationInsert(items: NotificationItem[], notification: NotificationItem) {
  return items.some((item) => item.id === notification.id) ? items : [notification, ...items].slice(0, 25);
}

export function mergeNotificationUpdate(items: NotificationItem[], notification: NotificationItem) {
  return items.map((item) => item.id === notification.id ? { ...item, ...notification } : item);
}

export function isReservationNotification(notification: NotificationItem) {
  return notification.entity_type === "reservation" && ["reservation_requested", "reservation_approved", "reservation_rejected", "reservation_cancelled"].includes(notification.notification_type);
}

export function handleRealtimeNotification(notification: RealtimeNotification, condominiumId: string, userAccountId: string, accept: () => void, refresh: () => void) {
  if (notification.condominium_id !== condominiumId || notification.recipient_user_account_id !== userAccountId) return false;
  accept();
  if (isReservationNotification(notification)) refresh();
  return true;
}

export function NotificationCenter({ initialNotifications, timeZone, condominiumId, userAccountId }: { initialNotifications: NotificationItem[]; timeZone: string; condominiumId?: string; userAccountId?: string }) {
  const [items, setItems] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const unread = unreadNotificationCount(items);
  useEffect(() => {
    if (!condominiumId || !userAccountId) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase.channel(`notifications:${condominiumId}:${userAccountId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: notificationRealtimeFilter(userAccountId) }, (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
        const notification = payload.new as RealtimeNotification;
        handleRealtimeNotification(notification, condominiumId, userAccountId, () => setItems((current) => mergeNotificationInsert(current, notification)), () => router.refresh());
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: notificationRealtimeFilter(userAccountId) }, (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
        const notification = payload.new as RealtimeNotification;
        if (notification.condominium_id !== condominiumId || notification.recipient_user_account_id !== userAccountId) return;
        setItems((current) => mergeNotificationUpdate(current, notification));
      })
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") console.error("Notification realtime channel error");
        if (status === "TIMED_OUT") console.warn("Notification realtime channel timed out");
      });
    return () => { void supabase.removeChannel(channel); };
  }, [condominiumId, router, userAccountId]);
  const markOne = async (id: string) => { if (items.find((item) => item.id === id)?.read_at) return; setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item)); await markNotificationAsRead(id); };
  const markAll = async () => { if (!unread || busy) return; setBusy(true); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); await markAllNotificationsAsRead(); setBusy(false); };
  return <div className="notification-center"><button className="icon-button notification-button" type="button" aria-label={unread ? `Notificações, ${unread} não lidas` : "Notificações"} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={19} />{unread > 0 && <span className="notification-count">{unread > 9 ? "9+" : unread}</span>}</button>{open && <section className="notification-popover" aria-label="Notificações"><header><div><h2>Notificações</h2><span>{unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "Tudo em dia"}</span></div><button className="notification-close" type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}><X size={16} /></button></header>{unread > 0 && <button className="notification-mark-all" type="button" onClick={markAll} disabled={busy}><Check size={14} /> Marcar todas como lidas</button>}{items.length ? <div className="notification-list">{items.map((item) => <article className={`notification-item ${item.read_at ? "is-read" : "is-unread"}`} key={item.id} onClick={() => markOne(item.id)}><div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDateTimeInTimezone(item.created_at, timeZone)}</small></div>{item.entity_type === "reservation" && <Link href="/app/reservations" className="notification-link" aria-label="Abrir reservas" onClick={() => markOne(item.id)}><ExternalLink size={14} /></Link>}</article>)}</div> : <p className="notification-empty">Você não possui notificações.</p>}</section>}</div>;
}
