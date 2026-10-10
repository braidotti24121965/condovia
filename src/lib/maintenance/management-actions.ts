"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { fileRules, parseMoney, validUuid } from "@/lib/maintenance/validation";
import { contractDateError } from "@/lib/maintenance/contract-dates";

const root = "/app/condominium/maintenance";
const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
const optional = (f: FormData, key: string) => text(f, key) || null;
const checked = (f: FormData, key: string) => f.get(key) === "on";
const orderPath = (f: FormData) => {
  const id = text(f, "work_order_id");
  if (!validUuid(id)) redirect(`${root}/work-orders?error=Ordem inválida`);
  return `${root}/work-orders/${id}`;
};

async function call(permission: string, rpc: string, args: Record<string, unknown>, path: string) {
  const { supabase } = await requireCondominiumPermission(permission);
  const { error } = await supabase.rpc(rpc, args);
  if (error) {
    const safe = /^[A-ZÀ-Úa-zà-ú]/.test(error.message) && !/(column|relation|constraint|syntax|violates|duplicate|function)/i.test(error.message)
      ? error.message : "Não foi possível salvar. Confira os dados e permissões.";
    redirect(`${path}?error=${encodeURIComponent(safe)}`);
  }
  revalidatePath(root, "layout");
  redirect(`${path}?updated=1`);
}

export async function saveProvider(f: FormData) {
  const { context } = await requireCondominiumPermission("maintenance.contracts.manage");
  await call("maintenance.contracts.manage", "save_maintenance_provider", {
    p_condominium_id: context.id, p_id: optional(f, "id"), p_name: text(f, "full_name"), p_company: text(f, "company_name"),
    p_document_type: optional(f, "document_type"), p_document: text(f, "document_number"), p_phone: text(f, "phone"),
    p_email: text(f, "email"), p_address: text(f, "address"), p_service_type: text(f, "service_type"), p_status: text(f, "status"),
  }, `${root}/providers`);
}

export type ContractFormState = { error?: string; values?: Record<string, string>; attempt: number };

export async function saveContract(previous: ContractFormState, f: FormData): Promise<ContractFormState> {
  const { context, supabase } = await requireCondominiumPermission("maintenance.contracts.manage");
  const values = Object.fromEntries(["id", "service_provider_id", "title", "starts_on", "ends_on", "amount", "status", "notes"].map(key => [key, text(f, key)]));
  const failed = (error: string): ContractFormState => ({ error, values, attempt: previous.attempt + 1 });
  const dateError = contractDateError(values.starts_on, values.ends_on);
  if (dateError) return failed(dateError);
  let amount: number;
  try { amount = parseMoney(values.amount); } catch { return failed("Informe um valor total válido, igual ou maior que zero."); }
  const { error } = await supabase.rpc("save_maintenance_contract", {
    p_condominium_id: context.id, p_id: optional(f, "id"), p_provider: text(f, "service_provider_id"), p_title: text(f, "title"),
    p_start: values.starts_on, p_end: values.ends_on, p_amount: amount, p_status: text(f, "status"), p_notes: text(f, "notes"),
  });
  if (error) {
    const safe = /^[A-ZÀ-Úa-zà-ú]/.test(error.message) && !/(column|relation|constraint|syntax|violates|duplicate|function)/i.test(error.message)
      ? error.message : "Não foi possível salvar. Confira os dados e permissões.";
    return failed(safe);
  }
  revalidatePath(root, "layout");
  redirect(`${root}/contracts?updated=${crypto.randomUUID()}`);
}

export async function saveServiceType(f: FormData) {
  const { context } = await requireCondominiumPermission("maintenance.manage");
  await call("maintenance.manage", "save_maintenance_service_type", {
    p_condominium_id: context.id, p_id: optional(f, "id"), p_name: text(f, "name"), p_contract_required: checked(f, "contract_required"), p_status: text(f, "status"),
  }, `${root}/governance`);
}

export async function saveApprovalRule(f: FormData) {
  const { context } = await requireCondominiumPermission("maintenance.manage");
  await call("maintenance.manage", "save_maintenance_approval_rule", {
    p_condominium_id: context.id, p_id: optional(f, "id"), p_name: text(f, "name"), p_minimum: parseMoney(text(f, "minimum_amount")),
    p_maximum: text(f, "maximum_amount") ? parseMoney(text(f, "maximum_amount")) : null,
    p_role: text(f, "role_id"), p_quorum: Number(text(f, "required_approvals")), p_active: checked(f, "active"),
  }, `${root}/governance`);
}

export async function saveRequirement(f: FormData) {
  const { context } = await requireCondominiumPermission("maintenance.manage");
  await call("maintenance.manage", "save_maintenance_document_requirement", {
    p_condominium_id: context.id, p_service_type: text(f, "service_type_id"), p_kind: text(f, "document_kind"), p_before: text(f, "required_before"), p_remove: text(f, "remove") === "true",
  }, `${root}/governance`);
}

export async function updateOrderDetails(f: FormData) {
  await call("maintenance.finance.manage", "update_maintenance_order_details", {
    p_order: text(f, "work_order_id"), p_kind: text(f, "maintenance_kind"), p_service_type: optional(f, "service_type_id"),
    p_contract: optional(f, "contract_id"), p_provider: optional(f, "service_provider_id"), p_occurrence: optional(f, "occurrence_id"),
    p_estimated: parseMoney(text(f, "estimated_amount")), p_actual: parseMoney(text(f, "actual_amount")), p_scheduled: optional(f, "scheduled_on"),
  }, orderPath(f));
}

export async function saveQuotation(f: FormData) {
  await call("maintenance.finance.manage", "save_maintenance_quotation", {
    p_order: text(f, "work_order_id"), p_provider: text(f, "service_provider_id"), p_amount: parseMoney(text(f, "amount")),
    p_description: text(f, "description"), p_valid_until: text(f, "valid_until"),
  }, orderPath(f));
}

export async function selectQuotation(f: FormData) {
  await call("maintenance.finance.manage", "select_maintenance_quotation", { p_quotation: text(f, "quotation_id") }, orderPath(f));
}

export async function requestApproval(f: FormData) {
  await call("maintenance.finance.manage", "request_maintenance_financial_approval", { p_order: text(f, "work_order_id") }, orderPath(f));
}

export async function decideApproval(f: FormData) {
  await call("maintenance.finance.approve", "decide_maintenance_financial_approval", {
    p_step: text(f, "step_id"), p_decision: text(f, "decision"), p_reason: text(f, "reason"),
  }, orderPath(f));
}

export async function saveChecklist(f: FormData) {
  const permission = text(f, "item_id") ? "maintenance.orders.update" : "maintenance.orders.manage";
  await call(permission, "save_maintenance_checklist", {
    p_order: text(f, "work_order_id"), p_item: optional(f, "item_id"), p_description: text(f, "description"), p_required: checked(f, "required"), p_completed: checked(f, "completed"),
  }, orderPath(f));
}

export async function savePlan(f: FormData) {
  const { context } = await requireCondominiumPermission("maintenance.plans.manage");
  await call("maintenance.plans.manage", "save_maintenance_plan", {
    p_condominium_id: context.id, p_id: optional(f, "id"), p_structure: text(f, "structure_id"), p_equipment: optional(f, "equipment_id"),
    p_type: optional(f, "service_type_id"), p_provider: optional(f, "service_provider_id"), p_contract: optional(f, "contract_id"),
    p_responsible: optional(f, "responsible_user_account_id"), p_description: text(f, "description"), p_interval: Number(text(f, "interval_days")),
    p_next: text(f, "next_due_on"), p_advance: Number(text(f, "advance_days")), p_estimated: parseMoney(text(f, "estimated_amount")),
    p_checklist: text(f, "checklist_template").split("\n").map(s => s.trim()).filter(Boolean), p_status: text(f, "status"),
  }, `${root}/plans`);
}

export async function generateDueOrders() {
  const { context, supabase } = await requireCondominiumPermission("maintenance.plans.manage");
  const { data, error } = await supabase.rpc("generate_due_maintenance_orders", { p_condominium_id: context.id });
  if (error) {
    const safe = /^[A-ZÀ-Úa-zà-ú]/.test(error.message) && !/(column|relation|constraint|syntax|violates|duplicate|function)/i.test(error.message)
      ? error.message : "Não foi possível gerar as ordens previstas.";
    redirect(`${root}/plans?error=${encodeURIComponent(safe)}`);
  }
  revalidatePath(root, "layout");
  const generated = Number(data ?? 0);
  redirect(`${root}/plans?generated=${generated}`);
}

export async function prepareDocumentUpload(f: FormData) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.documents.manage");
  const target = text(f, "target");
  const id = text(f, "target_id");
  const tables: Record<string, string> = { work_order: "maintenance_work_orders", contract: "maintenance_contracts", equipment: "maintenance_equipment", quotation: "maintenance_quotations" };
  if (!tables[target] || !validUuid(id)) return { error: "Destino inválido" };
  const size = Number(text(f, "size_bytes"));
  if (!Number.isInteger(size) || size <= 0 || size > fileRules.maxBytes || !fileRules.mimeTypes.includes(text(f, "mime_type"))) return { error: "Arquivo inválido ou acima de 10 MB." };
  const { data: parent } = await supabase.from(tables[target]).select("id").eq("id", id).eq("condominium_id", context.id).maybeSingle();
  if (!parent) return { error: "Destino não encontrado ou sem permissão." };
  const versionId = crypto.randomUUID();
  const objectPath = `${context.id}/${versionId}`;
  const { data, error } = await supabase.storage.from("maintenance-documents").createSignedUploadUrl(objectPath, { upsert: false });
  if (error || !data) return { error: "Não foi possível preparar o envio." };
  return { versionId, objectPath, token: data.token };
}

export async function finishDocumentUpload(f: FormData) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.documents.manage");
  const target = text(f, "target");
  const id = text(f, "target_id");
  const versionId = text(f, "version_id");
  if (!validUuid(id) || !validUuid(versionId) || !["work_order", "contract", "equipment", "quotation"].includes(target)) return { error: "Destino inválido" };
  const objectPath = `${context.id}/${versionId}`;
  const { error } = await supabase.rpc("register_maintenance_document", {
    p_condominium_id: context.id, p_document: optional(f, "document_id"), p_version: versionId,
    p_work_order: target === "work_order" ? id : null, p_contract: target === "contract" ? id : null,
    p_equipment: target === "equipment" ? id : null, p_quotation: target === "quotation" ? id : null,
    p_title: text(f, "title"), p_kind: text(f, "document_kind"), p_filename: text(f, "filename"), p_mime: text(f, "mime_type"), p_size: Number(text(f, "size_bytes")),
  });
  if (error) {
    await supabase.storage.from("maintenance-documents").remove([objectPath]);
    return { error: "Não foi possível registrar o documento. Confira o destino e as permissões." };
  }
  revalidatePath(root, "layout");
  return { success: true };
}

export async function manageOrderTeam(f: FormData) {
  await call("maintenance.orders.manage", "manage_maintenance_order_team", {
    p_order: text(f, "work_order_id"), p_responsible: text(f, "responsible_user_account_id"), p_due: optional(f, "due_at"),
    p_participant: optional(f, "participant_user_account_id"), p_remove: text(f, "remove_participant") === "true",
  }, orderPath(f));
}
