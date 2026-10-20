"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FinanceActionState } from "@/lib/finance/actions";

type Action = (previousState: FinanceActionState, formData: FormData) => Promise<FinanceActionState>;
type Payment = { id: string; amount_cents: number; paid_on: string; method: string; notes: string | null; reversed_at: string | null; reversal_reason: string | null };
type Option = { id: string; name: string };
type Kind = "payable" | "receivable";
type Status = "open" | "partially_paid" | "partially_received" | "paid" | "received" | "cancelled";

const methodLabels: Record<string, string> = { pix: "PIX", boleto: "Boleto", transferencia: "Transferência", dinheiro: "Dinheiro", cartao: "Cartão", outro: "Outro" };

export function FinancePayableActions({ id, kind, status, description, categoryId, competenceDate, dueDate, amountCents, supplierId, notes, remainingCents, today, payments, categories, suppliers, period, updateAction, paymentAction, reverseAction, cancelAction, cancelledAt, cancelledBy, cancellationReason }: { id: string; kind: Kind; status: Status; description: string; categoryId: string | null; competenceDate: string; dueDate: string; amountCents: number; supplierId: string | null; notes: string | null; remainingCents: number; today: string; payments: Payment[]; categories: Option[]; suppliers: Option[]; period: string; updateAction?: Action; paymentAction: Action; reverseAction: Action; cancelAction: Action; cancelledAt?: string | null; cancelledBy?: string | null; cancellationReason?: string | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"edit" | "payment" | "payments" | "cancel" | "details" | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const noopAction: Action = async () => ({ ok: false, message: "Ação indisponível." });
  const [editState, editFormAction] = useActionState(updateAction ?? noopAction, { ok: false });
  const [paymentState, paymentFormAction] = useActionState(paymentAction, { ok: false });
  const [reverseState, reverseFormAction] = useActionState(reverseAction, { ok: false });
  const [cancelState, cancelFormAction] = useActionState(cancelAction, { ok: false });
  const canEdit = kind === "payable" && status === "open" && Boolean(updateAction);
  const canPay = (status === "open" || status === "partially_paid" || status === "partially_received") && remainingCents > 0;
  const canCancel = status === "open" || status === "partially_paid" || status === "partially_received";

  useEffect(() => {
    if (mode) dialogRef.current?.showModal();
    else if (dialogRef.current?.open) dialogRef.current.close();
  }, [mode]);

  const close = () => { dialogRef.current?.close(); setMode(null); };
  useEffect(() => {
    const state = mode === "edit" ? editState : mode === "payment" ? paymentState : mode === "cancel" ? cancelState : mode === "payments" ? reverseState : null;
    if (state?.ok) {
      setSuccessMessage(state.message ?? "Operação concluída.");
      close();
      router.refresh();
    }
  }, [cancelState, editState, mode, paymentState, reverseState, router]);
  const title = mode === "edit" ? "Editar conta a pagar" : mode === "payment" ? "Registrar pagamento" : mode === "payments" ? `Pagamentos (${payments.length})` : mode === "cancel" ? "Cancelar conta" : "Detalhes da conta cancelada";
  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;

  return <>
    <div className="cv-finance-entry-actions">
      {canEdit && <button type="button" className="button button-secondary button-compact" onClick={() => setMode("edit")}>Editar</button>}
      {canPay && <button type="button" className="button button-secondary button-compact" onClick={() => setMode("payment")}>Registrar pagamento</button>}
      {payments.length > 0 && <button type="button" className="button button-secondary button-compact" onClick={() => setMode("payments")}>Pagamentos ({payments.length})</button>}
      {canCancel && <button type="button" className="button button-destructive button-compact" onClick={() => setMode("cancel")}>Cancelar</button>}
      {status === "cancelled" && <button type="button" className="button button-secondary button-compact" onClick={() => setMode("details")}>Detalhes</button>}
    </div>
    {successMessage && <p className="cv-alert cv-alert-success" role="status" aria-live="polite">{successMessage}</p>}
    <dialog ref={dialogRef} className="cv-finance-dialog" onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="cv-finance-dialog-panel">
        <header className="cv-finance-dialog-header"><h2>{title}</h2><button type="button" className="cv-finance-dialog-close" onClick={close} aria-label="Fechar">×</button></header>
        {mode === "edit" && updateAction && <form action={editFormAction} className="cv-form cv-form-grid cv-finance-dialog-grid">
          {!editState.ok && editState.message && <p className="cv-alert cv-alert-error" role="alert">{editState.message}</p>}{hidden("id", id)}{hidden("period", period)}
          <label>Descrição<input name="description" defaultValue={description} required minLength={2} autoComplete="off" /></label>
          <label>Categoria<select name="category_id" defaultValue={categoryId ?? ""}><option value="">Não informado</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Competência<input name="competence_date" type="date" defaultValue={competenceDate} required autoComplete="off" /></label>
          <label>Vencimento<input name="due_date" type="date" defaultValue={dueDate} required autoComplete="off" /></label>
          <label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" defaultValue={(amountCents / 100).toFixed(2)} required autoComplete="off" /></label>
          <label>Fornecedor<select name="supplier_id" defaultValue={supplierId ?? ""}><option value="">Não informado</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="cv-form-wide">Observações<textarea name="notes" defaultValue={notes ?? ""} rows={3} autoComplete="off" /></label>
          <footer className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button><SubmitButton type="submit" pendingLabel="Salvando...">Confirmar</SubmitButton></footer>
        </form>}
        {mode === "payment" && <form action={paymentFormAction} className="cv-form cv-form-grid cv-finance-dialog-grid">
          {!paymentState.ok && paymentState.message && <p className="cv-alert cv-alert-error" role="alert">{paymentState.message}</p>}{hidden("id", id)}{hidden("kind", kind)}{hidden("period", period)}
          <label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" defaultValue={(remainingCents / 100).toFixed(2)} required autoComplete="off" /></label>
          <label>Data<input name="paid_on" type="date" defaultValue={today} required autoComplete="off" /></label>
          <label>Forma<select name="method" defaultValue="pix"><option value="pix">PIX</option><option value="boleto">Boleto</option><option value="transferencia">Transferência</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="outro">Outro</option></select></label>
          <label>Observação<input name="notes" autoComplete="off" /></label>
          <footer className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button><SubmitButton type="submit" pendingLabel="Registrando...">Confirmar</SubmitButton></footer>
        </form>}
        {mode === "payments" && <div className="cv-finance-payment-history">{!reverseState.ok && reverseState.message && <p className="cv-alert cv-alert-error" role="alert">{reverseState.message}</p>}<table className="cv-table"><thead><tr><th>Data</th><th>Valor</th><th>Forma</th><th>Observação</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.id}><td>{payment.paid_on}</td><td>{(payment.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td>{methodLabels[payment.method] ?? payment.method}</td><td>{payment.notes || "—"}</td><td>{payment.reversed_at ? "Estornado" : "Ativo"}</td><td>{!payment.reversed_at && <form action={reverseFormAction}>{hidden("id", payment.id)}{hidden("kind", kind)}{hidden("period", period)}<input name="reason" required minLength={3} autoComplete="off" placeholder="Motivo do estorno" aria-label="Motivo do estorno" /><SubmitButton type="submit" size="compact" variant="destructive" pendingLabel="Estornando...">Estornar</SubmitButton></form>}</td></tr>)}</tbody></table><div className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button></div></div>}
        {mode === "cancel" && <form action={cancelFormAction} className="cv-form cv-finance-dialog-grid">{!cancelState.ok && cancelState.message && <p className="cv-alert cv-alert-error" role="alert">{cancelState.message}</p>}{hidden("id", id)}{hidden("kind", kind)}{hidden("period", period)}<label>Motivo obrigatório<input name="reason" required minLength={3} autoComplete="off" /></label><footer className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button><SubmitButton type="submit" size="compact" variant="destructive" pendingLabel="Cancelando...">Confirmar cancelamento</SubmitButton></footer></form>}
        {mode === "details" && <div><p><strong>Motivo:</strong> {cancellationReason || "Não informado"}</p><p><strong>Cancelado por:</strong> {cancelledBy || "Não informado"}</p><p><strong>Cancelado em:</strong> {cancelledAt ? new Date(cancelledAt).toLocaleString("pt-BR") : "Não informado"}</p><div className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button></div></div>}
      </div>
    </dialog>
  </>;
}
