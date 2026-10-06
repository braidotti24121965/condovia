"use client";
import { useActionState, useState } from "react";
import { confirmImport, previewImport, type ImportActionState } from "@/lib/imports/actions";
import { importEntities, importTemplates, type ImportEntity } from "@/lib/imports/types";
const initial: ImportActionState = { ok:false };
export function ImportWizard() {
  const [state, action, pending] = useActionState(previewImport, initial);
  const [entity, setEntity] = useState<ImportEntity>("structures");
  const [confirmState, confirmAction] = useActionState(async (_: ImportActionState, form: FormData): Promise<ImportActionState> => {
    const result = await confirmImport(form);
    return { ok: result.ok, message: result.message };
  }, initial);
  return <div className="cv-page">
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2>Nova importação</h2><p>Um arquivo por entidade. O domínio só será gravado após a confirmação.</p></div></div>
      <form action={action} className="cv-form-grid" encType="multipart/form-data">
        <label>Entidade<select name="entity" value={entity} onChange={(event)=>setEntity(event.target.value as ImportEntity)}>{importEntities.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Arquivo CSV<input name="file" type="file" accept=".csv" required /></label>
        <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Lendo..." : "Ler e gerar prévia"}</button>
      </form>
      <button type="button" className="button button-outline" onClick={()=>{const blob=new Blob([importTemplates[entity].join(",")+"\n"],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=entity+"-template.csv";a.click();URL.revokeObjectURL(url);}}>Baixar template oficial CSV</button>
      {state.message && <p className="cv-field-error" role="alert">{state.message}</p>}
    </section>
    {state.ok && state.batchId && <section className="cv-panel"><div className="cv-panel-heading"><div><h2>Prévia do lote</h2><p>{state.rows?.length || 0} linhas lidas. Nenhum dado de domínio foi gravado.</p></div></div><div className="cv-import-summary"><strong>{state.rows?.filter((row)=>row.classification==="new").length || 0} novos</strong><strong>{state.rows?.filter((row)=>row.classification==="duplicate").length || 0} duplicados</strong><strong>{state.rows?.filter((row)=>row.classification==="invalid").length || 0} inválidos</strong></div><div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Linha</th><th>Classificação</th><th>Mensagem</th></tr></thead><tbody>{state.rows?.slice(0,100).map((row)=><tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.classification}</td><td>{row.message || "—"}</td></tr>)}</tbody></table></div><p>Linhas inválidas e duplicadas permanecem no relatório e serão ignoradas.</p><form action={confirmAction}><input type="hidden" name="batch_id" value={state.batchId}/><button className="button button-primary" type="submit">Confirmar importação</button></form>{confirmState.message && <p role="status">{confirmState.message}</p>}</section>}
  </div>;
}
