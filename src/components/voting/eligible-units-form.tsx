"use client";

import { useState, type ChangeEvent } from "react";
import { saveEligibleUnitsAction } from "@/lib/voting/actions";
import { SubmitButton } from "@/components/ui/submit-button";

/** Lê a lista de lotes em dia de um arquivo (um código por linha) e permite conferir antes de salvar. */
export function EligibleUnitsForm({ assemblyId }: { assemblyId: string }) {
  const [text, setText] = useState("");

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setText(await file.text());
  }

  return <form action={saveEligibleUnitsAction} className="cv-form">
    <input type="hidden" name="assembly_id" value={assemblyId} />
    <div className="cv-form-grid">
      <label className="cv-field-lg">Arquivo da administradora (.txt ou .csv)<input type="file" accept=".txt,.csv,text/plain,text/csv" onChange={readFile} /></label>
      <label className="cv-field-lg">Lotes em dia (um código por linha)<textarea name="lots" rows={6} required value={text} onChange={(event) => setText(event.target.value)} /></label>
      <SubmitButton variant="primary" size="default" type="submit" pendingLabel="Salvando...">Salvar lotes em dia</SubmitButton>
    </div>
  </form>;
}
