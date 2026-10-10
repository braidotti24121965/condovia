"use server";

import { revalidatePath } from "next/cache";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { fileRules, validUuid } from "@/lib/maintenance/validation";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const root = "/app/condominium/maintenance";

export async function prepareDocumentUpload(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.documents.manage");
  const target = text(form, "target");
  const id = text(form, "target_id");
  const tables: Record<string, string> = { work_order: "maintenance_work_orders", contract: "maintenance_contracts", equipment: "maintenance_equipment", quotation: "maintenance_quotations" };
  const size = Number(text(form, "size_bytes"));
  if (!tables[target] || !validUuid(id) || !Number.isInteger(size) || size <= 0 || size > fileRules.maxBytes || !fileRules.mimeTypes.includes(text(form, "mime_type"))) return { error: "Arquivo ou destino inválido." };
  const { data: parent } = await supabase.from(tables[target]).select("id").eq("id", id).eq("condominium_id", context.id).maybeSingle();
  if (!parent) return { error: "Destino não encontrado ou sem permissão." };
  const versionId = crypto.randomUUID();
  const objectPath = `${context.id}/${versionId}`;
  const { data, error } = await supabase.storage.from("maintenance-documents").createSignedUploadUrl(objectPath, { upsert: false });
  if (error || !data) return { error: "Não foi possível preparar o envio." };
  return { versionId, objectPath, token: data.token };
}

export async function finishDocumentUpload(form: FormData) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.documents.manage");
  const target = text(form, "target");
  const id = text(form, "target_id");
  const versionId = text(form, "version_id");
  if (!validUuid(id) || !validUuid(versionId) || !["work_order", "contract", "equipment", "quotation"].includes(target)) return { error: "Destino inválido." };
  const objectPath = `${context.id}/${versionId}`;
  const { error } = await supabase.rpc("register_maintenance_document", {
    p_condominium_id: context.id, p_document: text(form, "document_id") || null, p_version: versionId,
    p_work_order: target === "work_order" ? id : null, p_contract: target === "contract" ? id : null,
    p_equipment: target === "equipment" ? id : null, p_quotation: target === "quotation" ? id : null,
    p_title: text(form, "title"), p_kind: text(form, "document_kind"), p_filename: text(form, "filename"), p_mime: text(form, "mime_type"), p_size: Number(text(form, "size_bytes")),
  });
  if (error) { await supabase.storage.from("maintenance-documents").remove([objectPath]); return { error: "Não foi possível registrar o documento." }; }
  revalidatePath(root, "layout");
  return { success: true };
}
