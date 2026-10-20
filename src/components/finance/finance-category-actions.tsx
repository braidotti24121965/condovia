"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";

type Action = (formData: FormData) => void | Promise<void>;

export function FinanceCategoryActions({ id, name, kind, status, period, updateAction, statusAction, deleteAction }: { id: string; name: string; kind: "payable" | "receivable" | "both"; status: "active" | "inactive"; period: string; updateAction: Action; statusAction: Action; deleteAction: Action }) {
  const [confirming, setConfirming] = useState(false);
  return <div className="cv-inline-actions cv-finance-category-actions">
    <details>
      <summary className="button button-secondary button-compact">Editar</summary>
      <form action={updateAction} className="cv-finance-category-edit-form">
        <input type="hidden" name="id" value={id} /><input type="hidden" name="period" value={period} />
        <input name="name" defaultValue={name} required minLength={2} aria-label="Nome da categoria" />
        <select name="kind" defaultValue={kind} aria-label="Aplicação da categoria"><option value="both">Entradas e saídas</option><option value="payable">Saídas</option><option value="receivable">Entradas</option></select>
        <SubmitButton type="submit" pendingLabel="Salvando...">Salvar</SubmitButton>
      </form>
    </details>
    <form action={statusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="period" value={period} /><input type="hidden" name="status" value={status === "active" ? "inactive" : "active"} /><SubmitButton type="submit" variant="secondary" pendingLabel={status === "active" ? "Inativando..." : "Reativando..."}>{status === "active" ? "Inativar" : "Reativar"}</SubmitButton></form>
    {confirming ? <form action={deleteAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="period" value={period} /><SubmitButton type="submit" variant="destructive" pendingLabel="Excluindo...">Confirmar exclusão</SubmitButton></form> : <button type="button" className="button button-destructive button-compact" onClick={() => setConfirming(true)}>Excluir</button>}
  </div>;
}
