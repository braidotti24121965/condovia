"use client";

import { Button } from "@/components/ui/button";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="cv-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <div className="cv-panel cv-dialog-panel">
        <h2 id="confirmation-title">{title}</h2>
        <p className="cv-muted">{description}</p>
        <div className="cv-dialog-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
