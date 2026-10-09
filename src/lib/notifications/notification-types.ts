export type NotificationType = "reservation_requested" | "reservation_approved" | "reservation_rejected" | "reservation_cancelled" | "occurrence_created" | "occurrence_assigned" | "occurrence_commented" | "occurrence_status_changed" | "occurrence_resolved" | "occurrence_reopened" | "occurrence_closed" | "occurrence_cancelled" | "maintenance_request_created" | "maintenance_request_emergency" | "maintenance_request_approved" | "maintenance_request_rejected" | "maintenance_work_order_created" | "maintenance_work_order_assigned" | "maintenance_work_order_started" | "maintenance_work_order_submitted_for_validation" | "maintenance_work_order_validated" | "maintenance_work_order_cancelled" | "maintenance_work_order_activity_updated" | "maintenance_financial_approval_requested" | "maintenance_deadline_alert" | "maintenance_contract_expiry" | "maintenance_warranty_expiry";

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
