import type { NotificationItem } from "@/lib/notifications/notification-types";
import { validUuid } from "@/lib/maintenance/validation";
export function notificationHref(item: Pick<NotificationItem, "entity_type" | "entity_id">): string | null {
  if (item.entity_type === "reservation") return "/app/reservations";
  if (!validUuid(item.entity_id)) return null;
  const root = "/app/condominium/maintenance";
  switch (item.entity_type) {
    case "maintenance_work_order": return `${root}/work-orders/${item.entity_id}`;
    case "maintenance_request": return `${root}/requests/${item.entity_id}`;
    case "maintenance_approval_step": return `${root}/finance`;
    case "maintenance_contract": return `${root}/contracts`;
    case "maintenance_equipment": return `${root}/equipment/${item.entity_id}`;
    default: return null;
  }
}
