import { describe, expect, it, vi } from "vitest";
import { handleRealtimeNotification, logNotificationRealtimeInsert, logNotificationRealtimeStatus, mergeNotificationInsert, mergeNotificationUpdate, notificationRealtimeFilter, unreadNotificationCount } from "./notification-center";
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
  it("refreshes for every reservation notification type and preserves unread state", () => {
    for (const [index, type] of ["reservation_requested", "reservation_approved", "reservation_rejected", "reservation_cancelled"].entries()) {
      const notification = { ...item(String(index), null, type as NotificationItem["notification_type"]), condominium_id: "condo-1", recipient_user_account_id: "user-1" };
      const accept = vi.fn(); const refresh = vi.fn();
      expect(handleRealtimeNotification(notification, "condo-1", "user-1", accept, refresh)).toBe(true);
      expect(accept).toHaveBeenCalledOnce(); expect(refresh).toHaveBeenCalledOnce(); expect(notification.read_at).toBeNull();
    }
  });
  it("ignores another recipient or condominium and preserves non-reservation behavior", () => {
    const notification = { ...item("1", null, "reservation_requested"), condominium_id: "condo-1", recipient_user_account_id: "user-1" };
    const accept = vi.fn(); const refresh = vi.fn();
    expect(handleRealtimeNotification({ ...notification, recipient_user_account_id: "user-2" }, "condo-1", "user-1", accept, refresh)).toBe(false);
    expect(handleRealtimeNotification({ ...notification, condominium_id: "condo-2" }, "condo-1", "user-1", accept, refresh)).toBe(false);
    expect(handleRealtimeNotification({ ...notification, entity_type: "other" }, "condo-1", "user-1", accept, refresh)).toBe(true);
    expect(accept).toHaveBeenCalledOnce(); expect(refresh).not.toHaveBeenCalled();
  });
  it("makes all notification realtime statuses and INSERT observable without payload data", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const status of ["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]) logNotificationRealtimeStatus(status);
    logNotificationRealtimeInsert();
    expect(info).toHaveBeenCalledWith("[notifications-realtime] status SUBSCRIBED");
    expect(error).toHaveBeenCalledWith("[notifications-realtime] status CHANNEL_ERROR");
    expect(warn).toHaveBeenCalledWith("[notifications-realtime] status TIMED_OUT");
    expect(info).toHaveBeenCalledWith("[notifications-realtime] status CLOSED");
    expect(info).toHaveBeenCalledWith("[notifications-realtime] event INSERT received=true");
    expect(JSON.stringify([...info.mock.calls, ...error.mock.calls, ...warn.mock.calls])).not.toContain("payload");
    expect(JSON.stringify([...info.mock.calls, ...error.mock.calls, ...warn.mock.calls])).not.toContain("user-1");
    info.mockRestore(); error.mockRestore(); warn.mockRestore();
  });
});
