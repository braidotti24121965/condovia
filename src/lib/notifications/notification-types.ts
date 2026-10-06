export type NotificationType = "reservation_requested" | "reservation_approved" | "reservation_rejected" | "reservation_cancelled";

export type NotificationItem = {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  read_at: string | null;
  created_at: string;
};
