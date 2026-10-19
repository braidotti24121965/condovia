"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function saveFinanceCategory(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("finance.categories.manage");
  const name = text(form, "name");
  const kind = text(form, "kind") || "both";
  if (name.length < 2) redirect("/app/condominium/finance?error=Informe uma categoria válida.");
  const { error } = await supabase.from("condominium_finance_categories").insert({ condominium_id: context.id, name, kind });
  if (error) redirect(`/app/condominium/finance?error=${encodeURIComponent(error.message.includes("duplicate") ? "Esta categoria já existe." : "Não foi possível salvar a categoria.")}`);
  revalidatePath("/app/condominium/finance");
  redirect("/app/condominium/finance?saved=category");
}

export async function savePayable(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("finance.payables.manage");
  const description = text(form, "description");
  const dueDate = text(form, "due_date");
  const competenceDate = text(form, "competence_date");
  const amount = Number(text(form, "amount"));
  const amountCents = Math.round(amount * 100);
  if (description.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(competenceDate) || !Number.isFinite(amount) || amountCents <= 0 || dueDate < competenceDate) redirect("/app/condominium/finance?error=Confira descrição, datas e valor da conta a pagar.");
  const { error } = await supabase.from("condominium_payables").insert({ condominium_id: context.id, category_id: text(form, "category_id") || null, description, competence_date: competenceDate, due_date: dueDate, amount_cents: amountCents, notes: text(form, "notes") || null });
  if (error) redirect(`/app/condominium/finance?error=${encodeURIComponent(error.message.includes("due") ? "O vencimento deve ser igual ou posterior à competência." : "Não foi possível salvar a conta a pagar.")}`);
  revalidatePath("/app/condominium/finance");
  redirect("/app/condominium/finance?saved=payable");
}

export async function saveReceivable(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("finance.receivables.manage");
  const description = text(form, "description");
  const dueDate = text(form, "due_date");
  const competenceDate = text(form, "competence_date");
  const amount = Number(text(form, "amount"));
  const amountCents = Math.round(amount * 100);
  if (description.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(competenceDate) || !Number.isFinite(amount) || amountCents <= 0 || dueDate < competenceDate) redirect("/app/condominium/finance?error=Confira descrição, datas e valor da receita.");
  const { error } = await supabase.from("condominium_receivables").insert({ condominium_id: context.id, category_id: text(form, "category_id") || null, description, competence_date: competenceDate, due_date: dueDate, amount_cents: amountCents, notes: text(form, "notes") || null });
  if (error) redirect(`/app/condominium/finance?error=${encodeURIComponent(error.message.includes("due") ? "O vencimento deve ser igual ou posterior à competência." : "Não foi possível salvar a receita.")}`);
  revalidatePath("/app/condominium/finance");
  redirect("/app/condominium/finance?saved=receivable");
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
