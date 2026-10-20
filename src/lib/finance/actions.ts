"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
type FinanceView = "overview" | "payables" | "receivables" | "cash-flow" | "bills";
type FinancePeriod = "today" | "7d" | "30d" | "60d" | "90d" | "all";
const validViews = new Set<FinanceView>(["overview", "payables", "receivables", "cash-flow", "bills"]);
const validPeriods = new Set<FinancePeriod>(["today", "7d", "30d", "60d", "90d", "all"]);
const viewOf = (form: FormData, fallback: FinanceView): FinanceView => { const value = text(form, "view") as FinanceView; return validViews.has(value) ? value : fallback; };
const periodOf = (form: FormData): FinancePeriod => { const value = text(form, "period") as FinancePeriod; return validPeriods.has(value) ? value : "today"; };
const financeUrl = (view: FinanceView, period: FinancePeriod, params: Record<string, string> = {}) => { const query = new URLSearchParams({ view, period, ...params }); return `/app/condominium/finance?${query.toString()}`; };
const localToday = (timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (date: string, days: number) => { const result = new Date(`${date}T00:00:00Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10); };
const outsidePeriod = (dueDate: string, period: FinancePeriod, timeZone: string) => { if (period === "all") return false; const today = localToday(timeZone); const days = period === "today" ? 0 : Number(period.replace("d", "")); return dueDate > addDays(today, days); };

export async function saveFinanceCategory(form: FormData) {
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

export async function savePayable(form: FormData) {
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
  const { supabase, context } = await requireCondominiumPermission("finance.receivables.manage");
  const view = viewOf(form, "receivables"); const period = periodOf(form);
  const description = text(form, "description");
  const dueDate = text(form, "due_date");
  const competenceDate = text(form, "competence_date");
  const amount = Number(text(form, "amount"));
  const amountCents = Math.round(amount * 100);
  if (description.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(competenceDate) || !Number.isFinite(amount) || amountCents <= 0 || dueDate < competenceDate) redirect(financeUrl(view, period, { error: "Confira descrição, datas e valor da receita." }));
  const { error } = await supabase.from("condominium_receivables").insert({ condominium_id: context.id, category_id: text(form, "category_id") || null, description, competence_date: competenceDate, due_date: dueDate, amount_cents: amountCents, notes: text(form, "notes") || null });
  if (error) redirect(financeUrl(view, period, { error: error.message.includes("due") ? "O vencimento deve ser igual ou posterior à competência." : "Não foi possível salvar a receita." }));
  const { data: condominium } = await supabase.from("condominiums").select("timezone").eq("id", context.id).maybeSingle();
  revalidatePath("/app/condominium/finance");
  redirect(financeUrl(view, period, { saved: "receivable", savedDue: dueDate, savedOutside: outsidePeriod(dueDate, period, condominium?.timezone || "America/Sao_Paulo") ? "1" : "0" }));
}

export async function saveBill(form: FormData) {
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
  const { supabase, context } = await requireCondominiumPermission("finance.bills.manage");
  const id = text(form, "id");
  const status = text(form, "status");
  if (!id || !["received", "cancelled"].includes(status)) redirect("/app/condominium/finance?view=bills&error=Status de boleto inválido.");
  const { error } = await supabase.from("condominium_bills").update({ status, received_at: status === "received" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("condominium_id", context.id);
  if (error) redirect(`/app/condominium/finance?view=bills&error=${encodeURIComponent("Não foi possível atualizar o boleto.")}`);
  revalidatePath("/app/condominium/finance");
  redirect("/app/condominium/finance?view=bills&saved=bill-status");
}
