"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FinancePeriod } from "@/components/finance/finance-period-filter";

type Action = (formData: FormData) => void | Promise<void>;
type Unit = { id: string; name: string; payerOptions: Array<{ id: string; name: string }> };

export function FinanceReceivableForm({ action, period, categories, units }: { action: Action; period: FinancePeriod; categories: Array<{ id: string; name: string }>; units: Unit[] }) {
  const [unitId, setUnitId] = useState("");
  const unit = useMemo(() => units.find(item => item.id === unitId), [unitId, units]);
  const [payerId, setPayerId] = useState("");
  const handleUnit = (value: string) => { setUnitId(value); setPayerId(units.find(item => item.id === value)?.payerOptions[0]?.id ?? ""); };
  return <form action={action} className="cv-form cv-form-grid cv-finance-payable-form"><input type="hidden" name="view" value="receivables" /><input type="hidden" name="period" value={period} /><label className="cv-field-lg">Descrição<input name="description" required minLength={2} autoComplete="off" /></label><label className="cv-field-md">Categoria<select name="category_id" defaultValue=""><option value="">Não informado</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="cv-field-md">Unidade<select name="unit_id" value={unitId} onChange={event => handleUnit(event.target.value)}><option value="">Sem unidade</option>{units.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="cv-field-md">Pagador<select name="payer_person_id" value={payerId} onChange={event => setPayerId(event.target.value)}><option value="">Não informado</option>{(unit?.payerOptions ?? []).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="cv-field-date">Competência<input name="competence_date" type="date" required autoComplete="off" /></label><label className="cv-field-date">Vencimento<input name="due_date" type="date" required autoComplete="off" /></label><label className="cv-field-date">Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" required inputMode="decimal" autoComplete="off" /></label><label className="cv-field-wide">Observações<textarea name="notes" rows={2} autoComplete="off" /></label><div className="cv-form-actions"><SubmitButton type="submit">Salvar receita</SubmitButton></div></form>;
}
