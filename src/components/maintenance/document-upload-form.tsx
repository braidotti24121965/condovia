"use client";

import { ContentSelect } from "@/components/ui/form-controls";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { documentKinds, fileRules } from "@/lib/maintenance/validation";
import { finishDocumentUpload, prepareDocumentUpload } from "@/lib/maintenance/management-actions";

export function DocumentUploadForm({ target, id, documentId, documentTitle, documentKind }: { target: "work_order" | "contract" | "equipment" | "quotation"; id: string; documentId?: string; documentTitle?: string; documentKind?: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: boolean }>({});
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > fileRules.maxBytes || !fileRules.mimeTypes.includes(file.type)) {
      setResult({ error: "Envie PDF, JPG, PNG, DOCX ou XLSX de até 10 MB." }); return;
    }
    // File bytes go directly to private Storage, avoiding server-action payload limits.
    data.delete("file");
    data.set("filename", file.name); data.set("mime_type", file.type); data.set("size_bytes", String(file.size));
    setBusy(true); setResult({});
    try {
      const prepared = await prepareDocumentUpload(data);
      if (prepared.error || !prepared.token || !prepared.objectPath || !prepared.versionId) { setResult({ error: prepared.error ?? "Falha ao preparar envio." }); return; }
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) { setResult({ error: "Envio indisponível." }); return; }
      const supabase = createBrowserClient(url, key);
      const { error } = await supabase.storage.from("maintenance-documents").uploadToSignedUrl(prepared.objectPath, prepared.token, file, { contentType: file.type });
      if (error) { setResult({ error: "Não foi possível enviar o arquivo. Tente novamente." }); return; }
      data.set("version_id", prepared.versionId);
      const registered = await finishDocumentUpload(data);
      setResult(registered);
      if (registered.success) { form.reset(); router.refresh(); }
    } catch {
      setResult({ error: "O envio não foi concluído. Tente novamente." });
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="cv-form cv-form-grid" aria-busy={busy}>
    <input type="hidden" name="target" value={target} /><input type="hidden" name="target_id" value={id} />{documentId && <><input type="hidden" name="document_id" value={documentId} /><input type="hidden" name="document_kind" value={documentKind} /></>}
    <label className="cv-field-md">Título<input name="title" required minLength={2} maxLength={180} defaultValue={documentTitle} readOnly={Boolean(documentId)} disabled={busy} /></label>
    <label className="cv-field-md">Tipo<ContentSelect name="document_kind" defaultValue={documentKind} disabled={busy || Boolean(documentId)}>{Object.entries(documentKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</ContentSelect></label>
    <label className="cv-form-wide">{documentId ? "Nova versão" : "Arquivo"}<input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx" disabled={busy} /><span className="cv-muted">PDF, JPG, PNG, DOCX ou XLSX · até 10 MB</span></label>
    {result.error && <div className="cv-form-wide"><Alert tone="error">{result.error}</Alert></div>}{result.success && <div className="cv-form-wide"><Alert tone="success">Documento salvo.</Alert></div>}
    <div className="cv-form-actions"><Button type="submit" disabled={busy}>{busy ? "Enviando…" : documentId ? "Enviar nova versão" : "Anexar documento"}</Button></div>
  </form>;
}
