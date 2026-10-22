"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { isFinanceEnabled } from "@/lib/finance/flag";
import { notFound } from "next/navigation";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
type FinanceView = "overview" | "payables" | "receivables" | "cash-flow" | "bills";
type FinancePeriod = "today" | "7d" | "30d" | "60d" | "90d" | "all";
export type FinanceActionState = { ok: boolean; message?: string };
const financeError = (message: string): FinanceActionState => ({ ok: false, message });
const financeSuccess = (message: string): FinanceActionState => ({ ok: true, message });
const validViews = new Set<FinanceView>(["overview", "payables", "receivables", "cash-flow", "bills"]);
const validPeriods = new Set<FinancePeriod>(["today", "7d", "30d", "60d", "90d", "all"]);
const viewOf = (form: FormData, fallback: FinanceView): FinanceView => { const value = text(form, "view") as FinanceView; return validViews.has(value) ? value : fallback; };
const periodOf = (form: FormData): FinancePeriod => { const value = text(form, "period") as FinancePeriod; return validPeriods.has(value) ? value : "today"; };
const financeUrl = (view: FinanceView, period: FinancePeriod, params: Record<string, string> = {}) => { const query = new URLSearchParams({ view, period, ...params }); return `/app/condominium/finance?${query.toString()}`; };
const localToday = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (date: string, days: number) => { const result = new Date(`${date}T00:00:00Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10); };
const outsidePeriod = (dueDate: string, period: FinancePeriod, timeZone: string) => { if (period === "all") return false; const today = localToday(timeZone); const days = period === "today" ? 0 : Number(period.replace("d", "")); return dueDate > addDays(today, days); };
const requireFinanceEnabled = () => { if (!isFinanceEnabled()) notFound(); };

export async function saveFinanceCategory(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.categories.manage");
  const view = viewOf(form, "overview"); const period = periodOf(form);
  const name = text(form, "name");
  const kind = text(form, "kind") || "both";
  if (name.length < 2) redirect(financeUrl(view, period, { error: "Informe uma categoria válida." }));
  const { error } = await supabase.from("condominium_finance_categories").insert({ condominium_id: context.id, name, kind });
  if (error) redirect(financeUrl(view, period, { error: error.message.includes("duplicate") ? "Esta categoria já existe." : "Não foi possível salvar a categoria." }));
  revalidatePath("/app/condominium/finance");
  redirect(financeUrl(view, period, { saved: "category" }));
}

export async function updateFinanceCategory(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.categories.manage");
  const id = text(form, "id"); const name = text(form, "name"); const kind = text(form, "kind");
  if (!id || name.length < 2 || !["payable", "receivable", "both"].includes(kind)) redirect(financeUrl("overview", periodOf(form), { error: "Confira o nome e a aplicação da categoria." }));
  const { error } = await supabase.from("condominium_finance_categories").update({ name, kind, updated_at: new Date().toISOString() }).eq("id", id).eq("condominium_id", context.id);
  if (error) redirect(financeUrl("overview", periodOf(form), { error: error.message.includes("duplicate") ? "Esta categoria já existe." : "Não foi possível atualizar a categoria." }));
  revalidatePath("/app/condominium/finance");
  redirect(financeUrl("overview", periodOf(form), { saved: "category" }));
}

export async function setFinanceCategoryStatus(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.categories.manage");
  const id = text(form, "id"); const status = text(form, "status");
  if (!id || !["active", "inactive"].includes(status)) redirect(financeUrl("overview", periodOf(form), { error: "Situação de categoria inválida." }));
  const { error } = await supabase.from("condominium_finance_categories").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("condominium_id", context.id);
  if (error) redirect(financeUrl("overview", periodOf(form), { error: "Não foi possível alterar a situação da categoria." }));
  revalidatePath("/app/condominium/finance");
  redirect(financeUrl("overview", periodOf(form), { saved: "category" }));
}

export async function deleteFinanceCategory(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.categories.manage");
  const id = text(form, "id");
  if (!id) redirect(financeUrl("overview", periodOf(form), { error: "Categoria inválida." }));
  const [{ count: payables }, { count: receivables }] = await Promise.all([
    supabase.from("condominium_payables").select("id", { count: "exact", head: true }).eq("category_id", id).eq("condominium_id", context.id),
    supabase.from("condominium_receivables").select("id", { count: "exact", head: true }).eq("category_id", id).eq("condominium_id", context.id),
  ]);
  if ((payables ?? 0) > 0 || (receivables ?? 0) > 0) redirect(financeUrl("overview", periodOf(form), { error: "Esta categoria já foi usada em contas e não pode ser excluída. Inative-a para que não apareça em novos lançamentos." }));
  const { error } = await supabase.from("condominium_finance_categories").delete().eq("id", id).eq("condominium_id", context.id);
  if (error) redirect(financeUrl("overview", periodOf(form), { error: "Não foi possível excluir a categoria." }));
  revalidatePath("/app/condominium/finance");
  redirect(financeUrl("overview", periodOf(form), { saved: "category" }));
}

export async function savePayable(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.payables.manage");
  const view = viewOf(form, "payables"); const period = periodOf(form);
  const description = text(form, "description");
  const dueDate = text(form, "due_date");
  const competenceDate = text(form, "competence_date");
  const amount = Number(text(form, "amount"));
  const amountCents = Math.round(amount * 100);
  if (description.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(competenceDate) || !Number.isFinite(amount) || amountCents <= 0 || dueDate < competenceDate) redirect(financeUrl(view, period, { error: "Confira descrição, datas e valor da conta a pagar." }));
  const { error } = await supabase.from("condominium_payables").insert({ condominium_id: context.id, category_id: text(form, "category_id") || null, description, competence_date: competenceDate, due_date: dueDate, amount_cents: amountCents, notes: text(form, "notes") || null });
  if (error) redirect(financeUrl(view, period, { error: error.message.includes("due") ? "O vencimento deve ser igual ou posterior à competência." : "Não foi possível salvar a conta a pagar." }));
  const { data: condominium } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  revalidatePath("/app/condominium/finance");
  redirect(financeUrl(view, period, { saved: "payable", savedDue: dueDate, savedOutside: outsidePeriod(dueDate, period, condominium?.timezone || "America/Sao_Paulo") ? "1" : "0" }));
}

export async function saveReceivable(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.receivables.manage");
  const view = viewOf(form, "receivables"); const period = periodOf(form);
  const description = text(form, "description");
  const dueDate = text(form, "due_date");
  const competenceDate = text(form, "competence_date");
  const amount = Number(text(form, "amount"));
  const amountCents = Math.round(amount * 100);
  if (description.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(competenceDate) || !Number.isFinite(amount) || amountCents <= 0 || dueDate < competenceDate) redirect(financeUrl(view, period, { error: "Confira descrição, datas e valor da receita." }));
  const { error } = await supabase.from("condominium_receivables").insert({ condominium_id: context.id, category_id: text(form, "category_id") || null, unit_id: text(form, "unit_id") || null, payer_person_id: text(form, "payer_person_id") || null, description, competence_date: competenceDate, due_date: dueDate, amount_cents: amountCents, notes: text(form, "notes") || null });
  if (error) redirect(financeUrl(view, period, { error: error.message.includes("due") ? "O vencimento deve ser igual ou posterior à competência." : "Não foi possível salvar a receita." }));
  const { data: condominium } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  revalidatePath("/app/condominium/finance");
  redirect(financeUrl(view, period, { saved: "receivable", savedDue: dueDate, savedOutside: outsidePeriod(dueDate, period, condominium?.timezone || "America/Sao_Paulo") ? "1" : "0" }));
}

export async function cancelFinanceEntry(_previousState: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  requireFinanceEnabled();
  const kind = text(form, "kind");
  const id = text(form, "id");
  const reason = text(form, "reason");
  const permission = kind === "receivable" ? "finance.receivables.manage" : "finance.payables.manage";
  const { supabase } = await requireCondominiumPermission(permission);
  if (!id || !["payable", "receivable"].includes(kind) || reason.length < 3) return financeError("Informe um motivo para cancelar a conta.");
  const { error } = await supabase.rpc("cancel_finance_entry", { p_kind: kind, p_entry_id: id, p_reason: reason });
  if (error) return financeError(error.message.includes("pagamentos ativos") ? "Não é possível cancelar uma conta com pagamentos ativos." : "Não foi possível cancelar a conta.");
  revalidatePath("/app/condominium/finance");
  return financeSuccess("Conta cancelada.");
}

export async function registerFinancePayment(_previousState: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  requireFinanceEnabled();
  const kind = text(form, "kind"); const id = text(form, "id"); const amount = Number(text(form, "amount"));
  const amountCents = Math.round(amount * 100); const paidOn = text(form, "paid_on"); const method = text(form, "method");
  const permission = kind === "receivable" ? "finance.receivables.manage" : "finance.payables.manage";
  const { supabase } = await requireCondominiumPermission(permission);
  if (!id || !["payable", "receivable"].includes(kind) || !Number.isInteger(amountCents) || amountCents <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || !["pix", "boleto", "transferencia", "dinheiro", "cartao", "outro"].includes(method)) return financeError("Confira os dados do pagamento.");
  const { error } = await supabase.rpc("register_finance_payment", { p_kind: kind, p_entry_id: id, p_amount_cents: amountCents, p_paid_on: paidOn, p_method: method, p_notes: text(form, "notes") || null });
  if (error) return financeError(error.message.includes("excede") ? "O pagamento excede o saldo da conta." : "Não foi possível registrar o pagamento.");
  revalidatePath("/app/condominium/finance");
  return financeSuccess(kind === "receivable" ? "Recebimento registrado." : "Pagamento registrado.");
}

export async function reverseFinancePayment(_previousState: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  requireFinanceEnabled();
  const id = text(form, "id"); const reason = text(form, "reason"); const kind = text(form, "kind");
  const permission = kind === "receivable" ? "finance.receivables.manage" : "finance.payables.manage";
  const { supabase } = await requireCondominiumPermission(permission);
  if (!id || reason.length < 3) return financeError("Informe o motivo do estorno.");
  const { error } = await supabase.rpc("reverse_finance_payment", { p_payment_id: id, p_reason: reason });
  if (error) return financeError("Não foi possível estornar o pagamento.");
  revalidatePath("/app/condominium/finance");
  return financeSuccess(kind === "receivable" ? "Recebimento estornado." : "Pagamento estornado.");
}

export async function updatePayable(_previousState: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.payables.manage");
  const id = text(form, "id"); const description = text(form, "description"); const competenceDate = text(form, "competence_date"); const dueDate = text(form, "due_date"); const amount = Number(text(form, "amount")); const amountCents = Math.round(amount * 100);
  if (!id || description.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(competenceDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < competenceDate || !Number.isFinite(amount) || amountCents <= 0) return financeError("Confira os dados da conta a pagar.");
  const { error } = await supabase.from("condominium_payables").update({ description, category_id: text(form, "category_id") || null, competence_date: competenceDate, due_date: dueDate, amount_cents: amountCents, supplier_id: text(form, "supplier_id") || null, notes: text(form, "notes") || null, updated_at: new Date().toISOString() }).eq("id", id).eq("condominium_id", context.id).eq("status", "open");
  if (error) return financeError("Não foi possível editar a conta. Contas com pagamentos não podem ser editadas.");
  revalidatePath("/app/condominium/finance");
  return financeSuccess("Conta atualizada.");
}

export async function updateReceivable(_previousState: FinanceActionState, form: FormData): Promise<FinanceActionState> {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.receivables.manage");
  const id = text(form, "id"); const description = text(form, "description"); const competenceDate = text(form, "competence_date"); const dueDate = text(form, "due_date"); const amount = Number(text(form, "amount")); const amountCents = Math.round(amount * 100);
  if (!id || description.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(competenceDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < competenceDate || !Number.isFinite(amount) || amountCents <= 0) return financeError("Confira os dados da receita.");
  const { error } = await supabase.from("condominium_receivables").update({ description, category_id: text(form, "category_id") || null, unit_id: text(form, "unit_id") || null, payer_person_id: text(form, "payer_person_id") || null, competence_date: competenceDate, due_date: dueDate, amount_cents: amountCents, notes: text(form, "notes") || null, updated_at: new Date().toISOString() }).eq("id", id).eq("condominium_id", context.id).eq("status", "open");
  if (error) return financeError("Não foi possível editar a receita. Contas com pagamentos não podem ser editadas.");
  revalidatePath("/app/condominium/finance");
  return financeSuccess("Receita atualizada.");
}

export async function saveBill(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.bills.manage");
  const reference = text(form, "reference");
  const dueDate = text(form, "due_date");
  const amount = Number(text(form, "amount"));
  const amountCents = Math.round(amount * 100);
  if (reference.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(amount) || amountCents <= 0) redirect("/app/condominium/finance?view=bills&error=Confira referência, vencimento e valor do boleto.");
  const { error } = await supabase.from("condominium_bills").insert({ condominium_id: context.id, receivable_id: text(form, "receivable_id") || null, reference, due_date: dueDate, amount_cents: amountCents, digitable_line: text(form, "digitable_line") || null, notes: text(form, "notes") || null });
  if (error) redirect(`/app/condominium/finance?view=bills&error=${encodeURIComponent(error.message.includes("unique") ? "Esta referência já está cadastrada." : "Não foi possível salvar o boleto.")}`);
  revalidatePath("/app/condominium/finance");
  redirect("/app/condominium/finance?view=bills&saved=bill");
}

export async function updateBillStatus(form: FormData) {
  requireFinanceEnabled();
  const { supabase, context } = await requireCondominiumPermission("finance.bills.manage");
  const id = text(form, "id");
  const status = text(form, "status");
  if (!id || !["received", "cancelled"].includes(status)) redirect("/app/condominium/finance?view=bills&error=Status de boleto inválido.");
  const { error } = await supabase.from("condominium_bills").update({ status, received_at: status === "received" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("condominium_id", context.id);
  if (error) redirect(`/app/condominium/finance?view=bills&error=${encodeURIComponent("Não foi possível atualizar o boleto.")}`);
  revalidatePath("/app/condominium/finance");
  redirect("/app/condominium/finance?view=bills&saved=bill-status");
}
