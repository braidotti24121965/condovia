"use server";
import { revalidatePath } from "next/cache";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { escapeCsvCell, fileHash, MAX_BYTES, normalizeRows, readTabularFile } from "./parser";
import type { ImportEntity, ImportRow } from "./types";
import { restorePreviewRows, type PersistedImportRow } from "./preview";
import { createHash } from "node:crypto";

export type ImportActionState = { ok: boolean; message?: string; batchId?: string; headers?: string[]; rows?: ImportRow[]; structuralError?: string; result?: { created: number; batch_id: string } };
const text = (form: FormData, key: string) => String(form.get(key) || "").trim();
function today(timeZone: string) { return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date()); }
function safeImportError(error: unknown) {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message || "")
      : String(error || "");
  const details = typeof error === "object" && error !== null && "details" in error ? String(error.details || "") : "";
  const hint = typeof error === "object" && error !== null && "hint" in error ? String(error.hint || "") : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code || "") : "";
  const message = `${rawMessage} ${details} ${hint} ${code}`.toLowerCase();
  if (message.includes("já possui um lote") || message.includes("lote já confirmado")) return rawMessage || "Lote inválido.";
  if (message.includes("permission") || message.includes("42501") || message.includes("permiss")) return "Você não possui permissão para executar esta importação.";
  if (message.includes("duplicate") || message.includes("unique") || message.includes("sobrepor")) return "O lote contém registros que já existem ou conflitam com dados atuais.";
  if (message.includes("lote não encontrado") || message.includes("batch not found")) return "O lote não foi encontrado ou sua sessão não tem acesso a ele. Atualize a página e tente novamente.";
  if (rawMessage) return `Não foi possível concluir a importação: ${rawMessage}`;
  return "Não foi possível concluir a importação agora.";
}

export async function previewImport(_: ImportActionState, form: FormData): Promise<ImportActionState> {
  const { supabase, context } = await requireCondominiumPermission("imports.manage");
  const entity = text(form,"entity") as ImportEntity; const file = form.get("file");
  if(!(file instanceof File) || !file.name) return { ok:false, message:"Selecione um arquivo." };
  if(file.size > MAX_BYTES) return { ok:false, message:"O arquivo excede o limite de 10 MB." };
  if(!/\.csv$/i.test(file.name)) return { ok:false, message:"Formato inválido. Use somente CSV." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  let parsed: ReturnType<typeof normalizeRows>;
  try { parsed = normalizeRows(readTabularFile(bytes),entity,today((await supabase.from("condominiums").select("timezone").eq("id",context.id).maybeSingle()).data?.timezone || "America/Sao_Paulo")); } catch(error) { return { ok:false, message:error instanceof Error ? error.message : "Não foi possível ler o arquivo." }; }
  if(parsed.structuralError) return { ok:false, message:parsed.structuralError, headers:parsed.headers, rows:parsed.rows, structuralError:parsed.structuralError };
  const hash = fileHash(bytes);
  let { data: existingBatch } = await supabase.from("import_batches").select("id,status,entity_type,mapping").eq("condominium_id",context.id).eq("entity_type", entity).eq("file_hash",hash).maybeSingle();
  if (existingBatch?.status === "rolled_back") {
    const { error: deleteError } = await supabase.from("import_batches").delete().eq("id", existingBatch.id).eq("status", "rolled_back");
    if (deleteError) return { ok:false, message:safeImportError(deleteError) };
    existingBatch = null;
  }
  if(existingBatch?.status === "preview" && (entity === "owners" || entity === "residents")) {
    // Recalculate relationship previews so a previously invalid preview is not reused after a fix.
    const { error: deleteError } = await supabase.from("import_batches").delete().eq("id", existingBatch.id).eq("status", "preview");
    if (deleteError) return { ok:false, message:safeImportError(deleteError) };
    existingBatch = null;
  } else if(existingBatch?.status === "preview") {
    const { data: persistedRows, error: persistedRowsError } = await supabase.from("import_batch_rows").select("row_number,classification,normalized_data,message").eq("batch_id",existingBatch.id).order("row_number");
    if(persistedRowsError) return { ok:false, message:safeImportError(persistedRowsError) };
    if (!persistedRows?.length) {
      const { error: deleteError } = await supabase.from("import_batches").delete().eq("id", existingBatch.id).eq("status", "preview");
      if (deleteError) return { ok:false, message:safeImportError(deleteError) };
      existingBatch = null;
    } else {
      const rows = restorePreviewRows((persistedRows || []) as PersistedImportRow[]);
      const mapping = existingBatch.mapping as { headers?: string[] } | null;
      return { ok:true, batchId:existingBatch.id, headers:mapping?.headers || parsed.headers, rows };
    }
  }
  if(existingBatch && existingBatch.status !== "rolled_back") return { ok:false, message:"Este arquivo já possui um lote registrado (" + existingBatch.status + ")." };
  let sourceRows = parsed.rows;
  if (entity === "owners" || entity === "residents") {
    const usesSourceKeys = parsed.headers.includes("unit_code") && parsed.headers.includes("person_cpf");
    if (usesSourceKeys) {
      const requestedCodes = [...new Set(parsed.rows.map((row) => row.data.unit_code.trim().toLowerCase()).filter(Boolean))];
      const requestedCpfs = [...new Set(parsed.rows.map((row) => row.data.person_cpf.replace(/\D/g, "")).filter(Boolean))];
      const keyChunks = Array.from({ length: Math.max(Math.ceil(requestedCodes.length / 500), Math.ceil(requestedCpfs.length / 500)) }, (_, index) =>
        supabase.rpc("resolve_relationship_import_keys", {
          p_condominium_id: context.id,
          p_unit_codes: requestedCodes.slice(index * 500, index * 500 + 500),
          p_cpfs: requestedCpfs.slice(index * 500, index * 500 + 500),
        }));
      const keyResults = await Promise.all(keyChunks);
      const resolveError = keyResults.find((result) => result.error)?.error;
      if (resolveError) return { ok: false, message: safeImportError(resolveError), headers: parsed.headers, rows: parsed.rows };
      const resolved = keyResults.flatMap((result) => (result.data || [])) as Array<{ unit_id: string | null; unit_code: string | null; person_id: string | null; person_cpf: string | null }>;
      const unitByCode = new Map(resolved.filter((item) => item.unit_id && item.unit_code).map((item) => [String(item.unit_code).trim().toLowerCase(), String(item.unit_id)]));
      const personByCpf = new Map(resolved.filter((item) => item.person_id).map((item) => [String(item.person_cpf || "").replace(/\D/g, ""), String(item.person_id)]));
      sourceRows = parsed.rows.map((row) => {
        if (row.classification !== "new") return row;
        const unitId = unitByCode.get(row.data.unit_code.trim().toLowerCase());
        const personId = personByCpf.get(row.data.person_cpf.replace(/\D/g, ""));
        if (!unitId || !personId) {
          const missing = [!unitId ? "unidade" : "", !personId ? "pessoa pelo CPF" : ""].filter(Boolean).join(" e ");
          return { ...row, classification: "invalid" as const, message: `Não foi possível localizar ${missing}.` };
        }
        return { ...row, data: { ...row.data, unit_id: unitId, person_id: personId } };
      });
    }
  }
  const seen = new Set<string>();
  const rows = sourceRows.map((row) => {
    const key = entity==="structures" ? row.data.name.toLowerCase()+"|"+(row.data.parent_id||"") : entity==="units" ? row.data.code.toLowerCase()+"|"+row.data.structure_id : entity==="people" ? row.data.full_name.toLowerCase()+"|"+(row.data.birth_date||"") : entity+"|"+row.data.unit_id+"|"+row.data.person_id+"|"+row.data.starts_at;
    if(row.classification==="new" && seen.has(key)) return {...row,classification:"duplicate" as const,message:"Registro duplicado no próprio arquivo."};
    seen.add(key); return row;
  });
  const { data: structures } = entity === "structures" ? await supabase.from("condominium_structures").select("name,parent_id").eq("condominium_id",context.id) : { data: [] as Array<{name:string;parent_id:string|null}> };
  const { data: units } = entity === "units" ? await supabase.from("units").select("code,structure_id").eq("condominium_id",context.id) : { data: [] as Array<{code:string;structure_id:string|null}> };
  const { data: people } = entity === "people" ? await supabase.from("people").select("id,full_name,birth_date,person_condominium_links!inner(condominium_id,status)").eq("status","active").eq("person_condominium_links.condominium_id",context.id).eq("person_condominium_links.status","active") : { data: [] as Array<{id:string;full_name:string;birth_date:string|null}> };
  const { data: documents } = entity === "people" ? await supabase.from("person_documents").select("person_id,document_hash").eq("document_type","cpf") : { data: [] as Array<{person_id:string;document_hash:string}> };
  const { data: owners } = entity === "owners" ? await supabase.from("unit_ownerships").select("unit_id,person_id,starts_at,ends_at").eq("condominium_id",context.id) : { data: [] as Array<{unit_id:string;person_id:string;starts_at:string;ends_at:string|null}> };
  const { data: residents } = entity === "residents" ? await supabase.from("unit_occupancies").select("unit_id,person_id,starts_at,ends_at").eq("condominium_id",context.id) : { data: [] as Array<{unit_id:string;person_id:string;starts_at:string;ends_at:string|null}> };
  const existing = entity === "structures" ? structures || [] : entity === "units" ? units || [] : entity === "people" ? people || [] : entity === "owners" ? owners || [] : residents || [];
  const classifiedRows = rows.map((row) => {
    if (row.classification !== "new") return row;
    const d = row.data;
    const duplicate = entity === "structures" ? (existing as Array<{name:string;parent_id:string|null}>).some((item) => item.name.trim().toLowerCase() === d.name.toLowerCase() && (item.parent_id || "") === (d.parent_id || ""))
      : entity === "units" ? (existing as Array<{code:string;structure_id:string|null}>).some((item) => item.code.trim().toLowerCase() === d.code.toLowerCase() && (item.structure_id || "") === (d.structure_id || ""))
      : entity === "people" ? ((d.cpf && (documents || []).some((item) => item.document_hash === createHash("sha256").update(d.cpf.replace(/\D/g,"")).digest("hex"))) || (people || []).some((item) => item.full_name.trim().toLowerCase() === d.full_name.toLowerCase() && !!d.birth_date && item.birth_date === d.birth_date))
      : (existing as Array<{unit_id:string;person_id:string;starts_at:string;ends_at:string|null}>).some((item) => item.unit_id === d.unit_id && item.person_id === d.person_id && item.starts_at === d.starts_at);
    if (!duplicate) return row;
    if (entity === "people") {
      const cpfHash = d.cpf ? createHash("sha256").update(d.cpf.replace(/\D/g,"")).digest("hex") : "";
      const documentPersonId = (documents || []).find((item) => item.document_hash === cpfHash)?.person_id;
      const nameBirthPersonId = (people || []).find((item) => item.full_name.trim().toLowerCase() === d.full_name.toLowerCase() && !!d.birth_date && item.birth_date === d.birth_date)?.id;
      const personId = documentPersonId || nameBirthPersonId;
      return { ...row, classification:"duplicate" as const, data: personId ? { ...row.data, person_id: personId, update_existing: "true" } : row.data, message: personId ? "Pessoa já existe; dados de contato serão atualizados." : "Registro já existe no condomínio." };
    }
    return { ...row, classification:"duplicate" as const, message:"Registro já existe no condomínio." };
  });
  const finalRows = classifiedRows.map((row) => entity === "people" && "cpf" in row.data && row.data.cpf
    ? { ...row, data: { ...row.data, cpf_hash: createHash("sha256").update(row.data.cpf.replace(/\D/g, "")).digest("hex") } }
    : row);
  const duplicateCount = finalRows.filter((row)=>row.classification==="duplicate").length;
  const invalidCount = finalRows.filter((row)=>row.classification==="invalid").length;
  const { data: batch, error } = await supabase.from("import_batches").insert({ condominium_id:context.id,created_by_user_account_id:(await supabase.from("user_accounts").select("id").eq("auth_user_id",(await supabase.auth.getUser()).data.user?.id || "").maybeSingle()).data?.id,entity_type:entity,file_name:file.name,file_hash:hash,mapping:{headers:parsed.headers},status:"preview",total_rows:finalRows.length,new_rows:finalRows.length-duplicateCount-invalidCount,duplicate_rows:duplicateCount,invalid_rows:invalidCount }).select("id").single();
  if(error || !batch) return { ok:false, message:safeImportError(error) };
  const persisted = finalRows.map((row)=>({batch_id:batch.id,condominium_id:context.id,row_number:row.rowNumber,classification:row.classification,normalized_data:row.data,message:row.message||null}));
  for (let offset = 0; offset < persisted.length; offset += 250) {
    const { error: rowError } = await supabase.from("import_batch_rows").insert(persisted.slice(offset, offset + 250));
    if(rowError) {
      await supabase.from("import_batches").delete().eq("id", batch.id).eq("status", "preview");
      return { ok:false, message:safeImportError(rowError) };
    }
  }
  return { ok:true,batchId:batch.id,headers:parsed.headers,rows:finalRows };
}

export async function confirmImport(form: FormData) {
  const { supabase } = await requireCondominiumPermission("imports.manage");
  const batchId = text(form,"batch_id");
  if (!batchId) return { ok:false, message:"Lote de importação não informado." };
  const { data, error } = await supabase.rpc("confirm_import_batch",{p_batch_id:batchId});
  if(error) return { ok:false,message:safeImportError(error) };
  revalidatePath("/app/condominium/imports"); revalidatePath("/app/condominium/units"); revalidatePath("/app/condominium/people"); revalidatePath("/app/condominium/owners"); revalidatePath("/app/condominium/residents");
  return { ok:true,message:"Importação confirmada.",result:data };
}

export async function exportImportCsv(batchId: string) {
  const { supabase } = await requireCondominiumPermission("imports.read");
  const rows: Array<{ row_number: number; classification: string; message: string | null; normalized_data: unknown }> = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("import_batch_rows").select("row_number,classification,message,normalized_data").eq("batch_id",batchId).order("row_number").range(offset, offset + 499);
    if (error) throw new Error(`Não foi possível gerar o relatório agora: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  return ["linha,classificacao,mensagem,dados",...rows.map((row)=>[row.row_number,row.classification,row.message||"",JSON.stringify(row.normalized_data)].map(escapeCsvCell).join(","))].join("\n");
}
