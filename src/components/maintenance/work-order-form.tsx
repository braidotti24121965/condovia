"use client";

import { ContentSelect, DateInput } from "@/components/ui/form-controls";


import { maintenanceKinds } from "@/lib/maintenance/validation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createMaintenanceWorkOrderAction } from "@/lib/maintenance/actions";

type Option = { id: string; name: string };
type Equipment = { id: string; identification: string; structure_id: string };

export function WorkOrderForm({ structures, equipment, users, providers, serviceTypes = [], contracts = [], canFinance = false, occurrenceId }: { structures: Option[]; equipment: Equipment[]; users: Option[]; providers: Option[]; serviceTypes?: Option[]; contracts?: Option[]; canFinance?: boolean; occurrenceId?: string }) {
  const [structureId, setStructureId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const eligibleEquipment = useMemo(() => equipment.filter((item) => item.structure_id === structureId), [equipment, structureId]);
  return <form action={createMaintenanceWorkOrderAction} className="cv-form cv-form-grid cv-work-order-form">
    <label className="cv-field-md">Estrutura<ContentSelect name="structure_id" required value={structureId} onChange={(event) => { setStructureId(event.target.value); setEquipmentId(""); }}><option value="">Selecione a área comum</option>{structures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</ContentSelect></label>
    <label className="cv-field-md">Equipamento relacionado<ContentSelect name="equipment_id" value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)}><option value="">Opcional</option>{eligibleEquipment.map((item) => <option key={item.id} value={item.id}>{item.identification}</option>)}</ContentSelect></label>
    <label className="cv-form-wide">Descrição do serviço<textarea name="description" required minLength={3} maxLength={10000} rows={4}/></label>
    <label className="cv-field-sm">Prioridade<ContentSelect name="priority" defaultValue="medium"><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="emergency">Emergência</option></ContentSelect></label>
    <label className="cv-field-md">Responsável interno<ContentSelect name="responsible_user_account_id"><option value="">A definir</option>{users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</ContentSelect></label>
    <label className="cv-field-md">Prestador cadastrado<ContentSelect name="service_provider_id"><option value="">Nenhum</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</ContentSelect></label>
    <label className="cv-field-xs cv-field-date">Prazo<DateInput name="due_at" /></label>
    {occurrenceId && <input type="hidden" name="occurrence_id" value={occurrenceId} />}
    {canFinance && <><label className="cv-field-md">Natureza<ContentSelect name="maintenance_kind" defaultValue="corrective">{Object.entries(maintenanceKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</ContentSelect></label>
      <label className="cv-field-md">Tipo de serviço<ContentSelect name="service_type_id"><option value="">Não informado</option>{serviceTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</ContentSelect></label>
      <label className="cv-field-md">Contrato<ContentSelect name="contract_id"><option value="">Sem contrato</option>{contracts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</ContentSelect></label>
      <label className="cv-field-sm">Orçamento previsto (R$)<input name="estimated_amount" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={0} /></label></>}
    <div className="cv-form-actions"><Button type="submit">Criar ordem de serviço</Button></div>
  </form>;
}
