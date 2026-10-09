"use client";

import { useActionState } from "react";
import { ContentSelect, DateInput } from "@/components/ui/form-controls";
import { saveContract } from "@/lib/maintenance/management-actions";
import { MoneyField, SelectField, type NamedOption } from "@/components/maintenance/management-ui";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

export type Contract = { id: string; service_provider_id: string; title: string; starts_on: string; ends_on: string; amount: number; status: string; notes: string | null };
export function ContractForm({ providers, item }: { providers: NamedOption[]; item?: Contract }) {
  const [state, action, pending] = useActionState(saveContract, { attempt: 0 });
  const values = state.values;
  return <><div aria-live="polite">{state.error && <Alert tone="error">{state.error}</Alert>}</div><form key={state.attempt} action={action} className="cv-form cv-form-grid">{item && <input type="hidden" name="id" value={item.id} />}<SelectField label="Fornecedor" name="service_provider_id" options={providers} selected={(values?.service_provider_id ?? item?.service_provider_id)} required />
    <label className="cv-field-md">Título do contrato<input name="title" defaultValue={(values?.title ?? item?.title)} required minLength={3} maxLength={180} /></label>
    <label className="cv-field-date">Início<DateInput name="starts_on" required defaultValue={(values?.starts_on ?? item?.starts_on)} /></label><label className="cv-field-date">Término<DateInput name="ends_on" required defaultValue={(values?.ends_on ?? item?.ends_on)} /></label>
    <MoneyField label="Valor total (R$)" name="amount" value={(values?.amount ?? item?.amount)} />
    <label className="cv-field-sm">Situação<ContentSelect name="status" defaultValue={(values?.status ?? item?.status) ?? "draft"}><option value="draft">Rascunho</option><option value="active">Ativo</option><option value="expired">Encerrado</option><option value="cancelled">Cancelado</option></ContentSelect></label>
    <label className="cv-form-wide">Observações<textarea name="notes" rows={3} defaultValue={(values?.notes ?? item?.notes) ?? ""} /></label><div className="cv-form-actions"><Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar contrato"}</Button></div></form></>;
}
