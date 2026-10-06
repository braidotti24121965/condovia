"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { confirmImport, previewImport, type ImportActionState } from "@/lib/imports/actions";
import { importEntities, importTemplates, type ImportEntity } from "@/lib/imports/types";
const initial: ImportActionState = { ok:false };
export function ImportWizard() {
  const [state, action, pending] = useActionState(previewImport, initial);
  const [entity, setEntity] = useState<ImportEntity>("structures");
  const [fileName, setFileName] = useState("");
  const [entityOpen, setEntityOpen] = useState(false);
  const [activeEntity, setActiveEntity] = useState(0);
  const entitySelectRef = useRef<HTMLDivElement>(null);
  const selectedEntity = importEntities.find((item) => item.value === entity) ?? importEntities[0];

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!entitySelectRef.current?.contains(event.target as Node)) setEntityOpen(false);
    };
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEntityOpen(false);
    };
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, []);

  const selectEntity = (index: number) => {
    const nextEntity = importEntities[index];
    if (!nextEntity) return;
    setEntity(nextEntity.value);
    setActiveEntity(index);
    setEntityOpen(false);
  };

  const handleEntityKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setEntityOpen(true);
      setActiveEntity((current) => (current + direction + importEntities.length) % importEntities.length);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (entityOpen) selectEntity(activeEntity);
      else {
        setActiveEntity(importEntities.findIndex((item) => item.value === entity));
        setEntityOpen(true);
      }
    }
  };
  const [confirmState, confirmAction] = useActionState(async (_: ImportActionState, form: FormData): Promise<ImportActionState> => {
    const result = await confirmImport(form);
    return { ok: result.ok, message: result.message };
  }, initial);
  return <div className="cv-page">
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2>Nova importação</h2><p>Um arquivo por entidade. O domínio só será gravado após a confirmação.</p></div></div>
      <form action={action} className="cv-form-grid cv-import-form" encType="multipart/form-data">
        <div className="cv-import-entity-field">
          <span className="cv-import-entity-label">Entidade</span>
          <div className="cv-import-entity-select" ref={entitySelectRef}>
            <input type="hidden" name="entity" value={entity} />
            <button type="button" className="cv-import-entity-trigger" aria-haspopup="listbox" aria-expanded={entityOpen} aria-controls="import-entity-options" onClick={() => { setActiveEntity(importEntities.findIndex((item) => item.value === entity)); setEntityOpen((open) => !open); }} onKeyDown={handleEntityKeyDown}>
              <span>{selectedEntity.label}</span><span aria-hidden="true">{entityOpen ? "▲" : "▼"}</span>
            </button>
            {entityOpen && <div id="import-entity-options" className="cv-import-entity-menu" role="listbox" aria-label="Entidade">
              {importEntities.map((item, index) => <button key={item.value} type="button" role="option" aria-selected={item.value === entity} className={`cv-import-entity-option${index === activeEntity ? " is-active" : ""}`} onMouseEnter={() => setActiveEntity(index)} onClick={() => selectEntity(index)}>{item.label}</button>)}
            </div>}
          </div>
        </div>
        <div className="cv-import-file-field">
          <span className="cv-import-file-label">Arquivo CSV</span>
          <div className="cv-import-file-control">
            <input id="import-file" name="file" type="file" accept=".csv" required className="cv-import-file-input" onChange={(event)=>setFileName(event.target.files?.[0]?.name ?? "")} />
            <span className="cv-import-file-name" aria-live="polite">{fileName || "Nenhum arquivo selecionado"}</span>
            <label htmlFor="import-file" className="button button-outline cv-import-file-trigger">Escolher arquivo</label>
          </div>
        </div>
        <div className="cv-import-actions">
          <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Lendo..." : "Ler e gerar prévia"}</button>
          <button type="button" className="button button-outline" onClick={()=>{const blob=new Blob([importTemplates[entity].join(",")+"\n"],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=entity+"-template.csv";a.click();URL.revokeObjectURL(url);}}>Baixar template oficial CSV</button>
        </div>
      </form>
      {state.message && <p className="cv-field-error" role="alert">{state.message}</p>}
    </section>
    {state.ok && state.batchId && <section className="cv-panel"><div className="cv-panel-heading"><div><h2>Prévia do lote</h2><p>{state.rows?.length || 0} linhas lidas. Nenhum dado de domínio foi gravado.</p></div></div><div className="cv-import-summary"><strong>{state.rows?.filter((row)=>row.classification==="new").length || 0} novos</strong><strong>{state.rows?.filter((row)=>row.classification==="duplicate").length || 0} duplicados</strong><strong>{state.rows?.filter((row)=>row.classification==="invalid").length || 0} inválidos</strong></div><div className="cv-table-wrap"><table className="cv-table"><thead><tr><th>Linha</th><th>Classificação</th><th>Mensagem</th></tr></thead><tbody>{state.rows?.slice(0,100).map((row)=><tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.classification}</td><td>{row.message || "—"}</td></tr>)}</tbody></table></div><p>Linhas inválidas e duplicadas permanecem no relatório e serão ignoradas.</p><form action={confirmAction}><input type="hidden" name="batch_id" value={state.batchId}/><button className="button button-primary" type="submit">Confirmar importação</button></form>{confirmState.message && <p role="status">{confirmState.message}</p>}</section>}
  </div>;
}
