import { describe, expect, it, vi } from "vitest";
import { canPollNotifications, hasNewReservationNotification, hasNotificationChanges, isReservationNotification, mergeNotificationInsert, mergeNotificationUpdate, mergePolledNotifications, NOTIFICATION_POLL_INTERVAL_MS, refreshReservationView, unreadNotificationCount } from "./notification-center";
import type { NotificationItem } from "@/lib/notifications/notification-types";

const item = (id: string, read_at: string | null, type: NotificationItem["notification_type"] = "reservation_requested"): NotificationItem => ({ id, read_at, notification_type: type, title: type, message: "Mensagem", entity_type: "reservation", entity_id: id, created_at: "2026-10-07T12:00:00Z" });

describe("notification center state", () => {
  it("counts only unread notifications", () => expect(unreadNotificationCount([item("1", null), item("2", "2026-10-07T13:00:00Z"), item("3", null)])).toBe(2));
  it("returns zero for an empty notification list", () => expect(unreadNotificationCount([])).toBe(0));
  it("supports every reservation notification type", () => expect(["reservation_requested", "reservation_approved", "reservation_rejected", "reservation_cancelled"].map((type, index) => item(String(index), null, type as NotificationItem["notification_type"])).map((notification) => notification.notification_type)).toEqual(["reservation_requested", "reservation_approved", "reservation_rejected", "reservation_cancelled"]));
  it("adds an unread insert without duplication", () => {
    const notification = item("2", null);
    expect(mergeNotificationInsert([item("1", null)], notification)).toEqual([notification, item("1", null)]);
    expect(mergeNotificationInsert([notification], notification)).toEqual([notification]);
    expect(unreadNotificationCount(mergeNotificationInsert([], notification))).toBe(1);
    expect(notification.read_at).toBeNull();
  });
  it("updates an existing notification", () => expect(mergeNotificationUpdate([item("1", null)], { ...item("1", null), read_at: "2026-10-07T13:00:00Z" })).toEqual([{ ...item("1", null), read_at: "2026-10-07T13:00:00Z" }]));
  it("merges polling results, preserves read_at and detects reservation changes", () => {
    const current = [item("1", "2026-10-07T13:00:00Z")];
    const incoming = [item("2", null, "reservation_requested"), item("1", null)];
    expect(mergePolledNotifications(current, incoming)[1].read_at).toBe("2026-10-07T13:00:00Z");
    expect(hasNotificationChanges(current, incoming)).toBe(true);
    expect(hasNewReservationNotification(current, incoming)).toBe(true);
    expect(isReservationNotification(incoming[0])).toBe(true);
  });

  it("does not refresh when polling finds no changes or a non-reservation notification", () => {
    const notification = item("1", null, "reservation_requested");
    expect(hasNotificationChanges([notification], [notification])).toBe(false);
    expect(hasNewReservationNotification([notification], [notification])).toBe(false);
    expect(hasNewReservationNotification([], [{ ...notification, entity_type: "other" }])).toBe(false);
  });

  it("keeps polling visible, suspends hidden/overlapping work, and schedules a transition refresh", () => {
    expect(NOTIFICATION_POLL_INTERVAL_MS).toBe(5000);
    expect(canPollNotifications("visible", false)).toBe(true);
    expect(canPollNotifications("hidden", false)).toBe(false);
    expect(canPollNotifications("visible", true)).toBe(false);
    const refresh = vi.fn(); const transition = vi.fn((callback: () => void) => callback());
    refreshReservationView(refresh, transition);
    expect(transition).toHaveBeenCalledOnce(); expect(refresh).toHaveBeenCalledOnce();
  });
});
