import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

export type FeedbackTone = "info" | "warning" | "error" | "success";

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: FeedbackTone }) {
  return <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function Toast({ children, tone = "info", onClose }: { children: ReactNode; tone?: FeedbackTone; onClose: () => void }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" || tone === "error" ? TriangleAlert : Info;
  return <div className={`cv-toast cv-toast-${tone}`} role={tone === "success" || tone === "info" ? "status" : "alert"} aria-live="polite">
    <Icon size={19} aria-hidden="true" />
    <div className="cv-toast-content">{children}</div>
    <Button variant="icon" size="compact" className="cv-toast-close" type="button" onClick={onClose} aria-label="Fechar alerta"><X size={16} /></Button>
  </div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="empty-state"><div className="empty-icon" aria-hidden="true">i</div><h2>{title}</h2><p>{description}</p>{action}</section>;
}
