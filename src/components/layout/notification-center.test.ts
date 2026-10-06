import { describe, expect, it } from "vitest";
import { mergeNotificationInsert, mergeNotificationUpdate, notificationRealtimeFilter, unreadNotificationCount } from "./notification-center";
import type { NotificationItem } from "@/lib/notifications/notification-types";

const item = (id: string, read_at: string | null, type: NotificationItem["notification_type"] = "reservation_requested"): NotificationItem => ({ id, read_at, notification_type: type, title: type, message: "Mensagem", entity_type: "reservation", entity_id: id, created_at: "2026-10-07T12:00:00Z" });

describe("notification center state", () => {
  it("counts only unread notifications", () => expect(unreadNotificationCount([item("1", null), item("2", "2026-10-07T13:00:00Z"), item("3", null)])).toBe(2));
  it("returns zero for an empty notification list", () => expect(unreadNotificationCount([])).toBe(0));
  it("supports every reservation notification type", () => expect(["reservation_requested", "reservation_approved", "reservation_rejected", "reservation_cancelled"].map((type, index) => item(String(index), null, type as NotificationItem["notification_type"])).map((notification) => notification.notification_type)).toEqual(["reservation_requested", "reservation_approved", "reservation_rejected", "reservation_cancelled"]));
  it("filters realtime notifications by recipient", () => expect(notificationRealtimeFilter("user-1")).toBe("recipient_user_account_id=eq.user-1"));
  it("adds an unread insert without duplication", () => {
    const notification = item("2", null);
    expect(mergeNotificationInsert([item("1", null)], notification)).toEqual([notification, item("1", null)]);
    expect(mergeNotificationInsert([notification], notification)).toEqual([notification]);
    expect(unreadNotificationCount(mergeNotificationInsert([], notification))).toBe(1);
    expect(notification.read_at).toBeNull();
  });
  it("updates an existing notification", () => expect(mergeNotificationUpdate([item("1", null)], { ...item("1", null), read_at: "2026-10-07T13:00:00Z" })).toEqual([{ ...item("1", null), read_at: "2026-10-07T13:00:00Z" }]));
});
