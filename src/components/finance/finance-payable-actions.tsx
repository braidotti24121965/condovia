"use client";

import { Fragment, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Toast } from "@/components/ui/feedback";
import type { FinanceActionState } from "@/lib/finance/actions";

type Action = (previousState: FinanceActionState, formData: FormData) => Promise<FinanceActionState>;
type Payment = { id: string; amount_cents: number; paid_on: string; method: string; notes: string | null; reversed_at: string | null; reversal_reason: string | null };
type Option = { id: string; name: string };
type UnitOption = { id: string; name: string; payerOptions: Option[] };
type Kind = "payable" | "receivable";
type Status = "open" | "partially_paid" | "partially_received" | "paid" | "received" | "cancelled";
type DialogMode = "edit" | "payment" | "payments" | "cancel" | "details" | null;

const methodLabels: Record<string, string> = { pix: "PIX", boleto: "Boleto", transferencia: "Transferência", dinheiro: "Dinheiro", cartao: "Cartão", outro: "Outro" };
const formatDate = (value: string) => value.split("-").reverse().join("/");

export function FinancePayableActions({ id, kind, status, description, categoryId, competenceDate, dueDate, amountCents, supplierId, unitId, payerPersonId, notes, remainingCents, today, payments, categories, suppliers, units, period, updateAction, paymentAction, reverseAction, cancelAction, cancelledAt, cancelledBy, cancellationReason }: { id: string; kind: Kind; status: Status; description: string; categoryId: string | null; competenceDate: string; dueDate: string; amountCents: number; supplierId: string | null; unitId?: string | null; payerPersonId?: string | null; notes: string | null; remainingCents: number; today: string; payments: Payment[]; categories: Option[]; suppliers: Option[]; units?: UnitOption[]; period: string; updateAction?: Action; paymentAction: Action; reverseAction: Action; cancelAction: Action; cancelledAt?: string | null; cancelledBy?: string | null; cancellationReason?: string | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"edit" | "payment" | "payments" | "cancel" | "details" | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [hideErrors, setHideErrors] = useState(false);
  const handledSuccess = useRef<FinanceActionState | null>(null);
  const noopAction: Action = async () => ({ ok: false, message: "Ação indisponível." });
  const [editState, editFormAction] = useActionState(updateAction ?? noopAction, { ok: false });
  const [paymentState, paymentFormAction] = useActionState(paymentAction, { ok: false });
  const [reverseState, reverseFormAction] = useActionState(reverseAction, { ok: false });
  const [cancelState, cancelFormAction] = useActionState(cancelAction, { ok: false });
  const canEdit = status === "open" && Boolean(updateAction);
  const canPay = (status === "open" || status === "partially_paid" || status === "partially_received") && remainingCents > 0;
  const canCancel = status === "open" || status === "partially_paid" || status === "partially_received";

  useEffect(() => {
    if (mode) dialogRef.current?.showModal();
    else if (dialogRef.current?.open) dialogRef.current.close();
  }, [mode]);

  const close = () => { dialogRef.current?.close(); setMode(null); setReverseTarget(null); setReverseReason(""); };
  useEffect(() => {
    const state = mode === "edit" ? editState : mode === "payment" ? paymentState : mode === "cancel" ? cancelState : mode === "payments" ? reverseState : null;
    if (state?.ok && state !== handledSuccess.current) {
      handledSuccess.current = state;
      setSuccessMessage(state.message ?? "Operação concluída.");
      close();
      router.refresh();
    }
  }, [cancelState, editState, mode, paymentState, reverseState, router]);
  useEffect(() => {
    if (!editState.ok || editState.message) setHideErrors(false);
    if (!paymentState.ok || paymentState.message) setHideErrors(false);
    if (!reverseState.ok || reverseState.message) setHideErrors(false);
    if (!cancelState.ok || cancelState.message) setHideErrors(false);
  }, [cancelState, editState, paymentState, reverseState]);
  const open = (nextMode: Exclude<DialogMode, null>) => { setSuccessMessage(null); setHideErrors(true); setMode(nextMode); };
  const reversePayment = reverseTarget ? payments.find((payment) => payment.id === reverseTarget) : null;
  useEffect(() => { if (successMessage) { const timer = window.setTimeout(() => setSuccessMessage(null), 4000); return () => window.clearTimeout(timer); } }, [successMessage]);
  useEffect(() => {
    if (reverseTarget || mode === "cancel") {
      window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input[name="reason"]')?.focus());
    }
  }, [mode, reverseTarget]);
  const receiving = kind === "receivable";
  const title = mode === "edit" ? (receiving ? "Editar receita" : "Editar conta a pagar") : mode === "payment" ? (receiving ? "Registrar recebimento" : "Registrar pagamento") : mode === "payments" ? `${receiving ? "Recebimentos" : "Pagamentos"} (${payments.length})` : mode === "cancel" ? (receiving ? "Cancelar receita" : "Cancelar conta") : "Detalhes da conta cancelada";
  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;

  return <>
    <div className="cv-finance-entry-actions">
      {canEdit && <button type="button" className="button button-secondary button-compact" onClick={() => open("edit")}>Editar</button>}
      {canPay && <button type="button" className="button button-secondary button-compact" onClick={() => open("payment")}>Registrar pagamento</button>}
      {payments.length > 0 && <button type="button" className="button button-secondary button-compact" onClick={() => open("payments")}>Pagamentos ({payments.length})</button>}
      {canCancel && <button type="button" className="button button-destructive button-compact" onClick={() => open("cancel")}>Cancelar</button>}
      {status === "cancelled" && <button type="button" className="button button-secondary button-compact" onClick={() => open("details")}>Detalhes</button>}
    </div>
    {successMessage && <Toast tone="success" onClose={() => setSuccessMessage(null)}>{successMessage}</Toast>}
    <dialog ref={dialogRef} className="cv-finance-dialog" onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="cv-finance-dialog-panel">
        <header className="cv-finance-dialog-header"><h2>{title}</h2><button type="button" className="cv-finance-dialog-close" onClick={close} aria-label="Fechar">×</button></header>
        {mode === "edit" && updateAction && <form action={editFormAction} className="cv-form cv-form-grid cv-finance-dialog-grid">
          {!hideErrors && !editState.ok && editState.message && <Alert tone="error">{editState.message}</Alert>}{hidden("id", id)}{hidden("period", period)}
          <label>Descrição<input name="description" defaultValue={description} required minLength={2} autoComplete="off" /></label>
          <label>Categoria<select name="category_id" defaultValue={categoryId ?? ""}><option value="">Não informado</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          {receiving && <><label>Unidade<select name="unit_id" defaultValue={unitId ?? ""}><option value="">Sem unidade</option>{(units ?? []).map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label>Pagador<select name="payer_person_id" defaultValue={payerPersonId ?? ""}><option value="">Não informado</option>{(units?.find(unit => unit.id === unitId)?.payerOptions ?? []).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label></>}
          <label>Competência<input name="competence_date" type="date" defaultValue={competenceDate} required autoComplete="off" /></label>
          <label>Vencimento<input name="due_date" type="date" defaultValue={dueDate} required autoComplete="off" /></label>
          <label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" defaultValue={(amountCents / 100).toFixed(2)} required autoComplete="off" /></label>
          <label>Fornecedor<select name="supplier_id" defaultValue={supplierId ?? ""}><option value="">Não informado</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="cv-form-wide">Observações<textarea name="notes" defaultValue={notes ?? ""} rows={3} autoComplete="off" /></label>
          <footer className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button><SubmitButton type="submit" pendingLabel="Salvando...">Confirmar</SubmitButton></footer>
        </form>}
        {mode === "payment" && <form action={paymentFormAction} className="cv-form cv-form-grid cv-finance-dialog-grid">
          {!hideErrors && !paymentState.ok && paymentState.message && <Alert tone="error">{paymentState.message}</Alert>}{hidden("id", id)}{hidden("kind", kind)}{hidden("period", period)}
          <label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" defaultValue={(remainingCents / 100).toFixed(2)} required autoComplete="off" /></label>
          <label>{receiving ? "Data do recebimento" : "Data do pagamento"}<input name="paid_on" type="date" defaultValue={today} required autoComplete="off" /></label>
          <label>Forma<select name="method" defaultValue="pix"><option value="pix">PIX</option><option value="boleto">Boleto</option><option value="transferencia">Transferência</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="outro">Outro</option></select></label>
          <label>Observação<input name="notes" autoComplete="off" /></label>
          <footer className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button><SubmitButton type="submit" pendingLabel="Registrando...">Confirmar</SubmitButton></footer>
        </form>}
        {mode === "payments" && <div className="cv-finance-payment-history">{!hideErrors && !reverseState.ok && reverseState.message && <Alert tone="error">{reverseState.message}</Alert>}<table className="cv-table cv-finance-payments-table"><colgroup><col className="cv-finance-col-date" /><col className="cv-finance-col-amount" /><col className="cv-finance-col-method" /><col className="cv-finance-col-status" /><col className="cv-finance-col-action" /></colgroup><thead><tr><th>Data</th><th>Valor</th><th>Forma</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{payments.map(payment => <><tr key={payment.id}><td className="cv-finance-nowrap">{formatDate(payment.paid_on)}</td><td className="cv-finance-nowrap">{(payment.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td className="cv-finance-nowrap">{methodLabels[payment.method] ?? payment.method}</td><td><span className={`cv-finance-payment-badge ${payment.reversed_at ? "is-reversed" : "is-active"}`}>{payment.reversed_at ? "Estornado" : "Ativo"}</span></td><td>{!payment.reversed_at && <button type="button" className="button button-destructive button-compact cv-finance-nowrap" onClick={() => { setReverseTarget(payment.id); setReverseReason(""); setHideErrors(true); }}>Estornar</button>}</td></tr>{(payment.notes || payment.reversed_at) && <tr key={`${payment.id}-details`} className="cv-finance-payment-detail-row"><td colSpan={5}>{payment.notes && <>Obs.: {payment.notes}</>}{payment.notes && payment.reversed_at && <br />}{payment.reversed_at && <>Estornado em {formatDate(payment.reversed_at.slice(0, 10))} · Motivo: {payment.reversal_reason || "Motivo não informado"}</>}</td></tr>}</>)}</tbody></table>{reverseTarget && reversePayment && <form action={reverseFormAction} className="cv-finance-reversal-confirmation">{hidden("id", reverseTarget)}{hidden("kind", kind)}{hidden("period", period)}<p>Estornar pagamento de <strong>{(reversePayment.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> de <strong>{formatDate(reversePayment.paid_on)}</strong></p><label>Motivo do estorno<input name="reason" value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} required minLength={3} autoComplete="off" /></label><div className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={() => setReverseTarget(null)}>Voltar</button><SubmitButton type="submit" size="compact" variant="destructive" pendingLabel="Estornando...">Confirmar estorno</SubmitButton></div></form>}<div className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button></div></div>}
        {mode === "cancel" && <form action={cancelFormAction} className="cv-form cv-finance-dialog-grid">{!hideErrors && !cancelState.ok && cancelState.message && <Alert tone="error">{cancelState.message}</Alert>}{hidden("id", id)}{hidden("kind", kind)}{hidden("period", period)}<label>Motivo obrigatório<input name="reason" required minLength={3} autoComplete="off" /></label><footer className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button><SubmitButton type="submit" size="compact" variant="destructive" pendingLabel="Cancelando...">Confirmar cancelamento</SubmitButton></footer></form>}
        {mode === "details" && <div><p><strong>Motivo:</strong> {cancellationReason || "Não informado"}</p><p><strong>Cancelado por:</strong> {cancelledBy || "Não informado"}</p><p><strong>Cancelado em:</strong> {cancelledAt ? new Date(cancelledAt).toLocaleString("pt-BR") : "Não informado"}</p><div className="cv-finance-dialog-actions"><button type="button" className="button button-secondary button-compact" onClick={close}>Fechar</button></div></div>}
      </div>
    </dialog>
  </>;
}
