import type { ReactNode } from "react";

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="empty-state"><div className="empty-icon" aria-hidden="true">i</div><h2>{title}</h2><p>{description}</p>{action}</section>;
}
