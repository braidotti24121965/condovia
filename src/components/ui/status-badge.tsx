import React, { type HTMLAttributes, type ReactNode } from "react";

export type StatusBadgeVariant = "success" | "neutral" | "warning" | "danger" | "info";

export function StatusBadge({ variant, children, className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { variant: StatusBadgeVariant; children?: ReactNode }) {
  return <span className={`status-badge status-badge-${variant} ${className}`} {...props}>{children}</span>;
}
