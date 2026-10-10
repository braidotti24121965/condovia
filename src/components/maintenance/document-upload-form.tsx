"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { documentKinds, fileRules } from "@/lib/maintenance/validation";
import { finishDocumentUpload, prepareDocumentUpload } from "@/lib/maintenance/management-actions";

type Target = "work_order" | "contract" | "equipment" | "quotation";
export function DocumentUploadForm({ target, id, documentId, documentTitle, documentKind }: { target: Target; id: string; documentId?: string; documentTitle?: string; documentKind?: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(false); const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > fileRules.maxBytes || !fileRules.mimeTypes.includes(file.type)) { setError("Envie PDF, JPG, PNG, DOCX ou XLSX de até 10 MB."); return; }
    data.delete("file"); data.set("filename", file.name); data.set("mime_type", file.type); data.set("size_bytes", String(file.size)); setBusy(true); setError(""); setSuccess(false);
    try {
      const prepared = await prepareDocumentUpload(data); if (prepared.error || !prepared.token || !prepared.objectPath || !prepared.versionId) { setError(prepared.error ?? "Falha ao preparar envio."); return; }
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !key) { setError("Envio indisponível."); return; }
      const client = createBrowserClient(url, key); const uploaded = await client.storage.from("maintenance-documents").uploadToSignedUrl(prepared.objectPath, prepared.token, file, { contentType: file.type });
      if (uploaded.error) { setError("Não foi possível enviar o arquivo."); return; }
      data.set("version_id", prepared.versionId); const registered = await finishDocumentUpload(data); if (registered.error) { setError(registered.error); return; }
      setSuccess(true); form.reset(); router.refresh();
    } catch { setError("O envio não foi concluído."); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="cv-form cv-form-grid" aria-busy={busy}><input type="hidden" name="target" value={target}/><input type="hidden" name="target_id" value={id}/>{documentId && <><input type="hidden" name="document_id" value={documentId}/><input type="hidden" name="document_kind" value={documentKind}/></>}<label className="cv-field-md">Título<input name="title" required minLength={2} maxLength={180} defaultValue={documentTitle} readOnly={Boolean(documentId)} disabled={busy}/></label><label className="cv-field-md">Tipo<select name="document_kind" defaultValue={documentKind} disabled={busy || Boolean(documentId)}>{Object.entries(documentKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="cv-form-wide">{documentId ? "Nova versão" : "Arquivo"}<input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" disabled={busy}/><span className="cv-muted">PDF, JPG, PNG, DOCX ou XLSX · até 10 MB</span></label>{error && <div className="cv-form-wide"><Alert tone="error">{error}</Alert></div>}{success && <div className="cv-form-wide"><Alert tone="success">Documento salvo.</Alert></div>}<Button type="submit" disabled={busy}>{busy ? "Enviando…" : documentId ? "Enviar nova versão" : "Anexar documento"}</Button></form>;
}
