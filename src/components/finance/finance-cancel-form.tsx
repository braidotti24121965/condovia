"use client";

import { SubmitButton } from "@/components/ui/submit-button";

export function FinanceCancelForm({ action, id, kind, period, label }: { action: (formData: FormData) => void | Promise<void>; id: string; kind: "payable" | "receivable"; period: string; label: string }) {
  return <form action={action} className="cv-inline-actions cv-finance-entry-actions">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="kind" value={kind} />
    <input type="hidden" name="period" value={period} />
    <label>
      <span className="sr-only">Motivo do cancelamento de {label}</span>
    <input name="reason" required minLength={3} autoComplete="off" placeholder="Motivo obrigatório" aria-label={`Motivo do cancelamento de ${label}`} />
    </label>
    <SubmitButton type="submit" variant="destructive" pendingLabel="Cancelando...">Cancelar</SubmitButton>
  </form>;
}
