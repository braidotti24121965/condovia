import { ContentSelect, DateInput } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { saveEquipment } from "@/lib/maintenance/actions";
import type { Equipment } from "@/lib/maintenance/types";

export function EquipmentForm({ structures, categories, current }: { structures: { id: string; name: string }[]; categories: { id: string; name: string }[]; current?: Equipment }) {
  return <form action={saveEquipment} className="cv-form cv-maintenance-equipment-form">
    {current && <input type="hidden" name="id" value={current.id} />}
    <div className="cv-maintenance-equipment-grid">
      <label className="cv-maintenance-equipment-identification">Identificação<input name="identification" required defaultValue={current?.identification} placeholder="Ex.: Bomba de recalque 01" /></label>
      <label className="cv-maintenance-equipment-structure">Estrutura<ContentSelect name="structure_id" required defaultValue={current?.structure_id ?? ""}><option value="">Selecione</option>{structures.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</ContentSelect></label>
      <label className="cv-maintenance-equipment-category">Categoria<ContentSelect name="category_id" defaultValue={current?.category_id ?? ""}><option value="">Sem categoria</option>{categories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</ContentSelect></label>
      <label className="cv-maintenance-equipment-location">Localização<input name="location" defaultValue={current?.location ?? ""} /></label>
      <label className="cv-maintenance-equipment-manufacturer">Fabricante<input name="manufacturer" defaultValue={current?.manufacturer ?? ""} /></label>
      <label className="cv-maintenance-equipment-model">Modelo<input name="model" defaultValue={current?.model ?? ""} /></label>
      <label className="cv-maintenance-equipment-serial">Número de série<input name="serial_number" defaultValue={current?.serial_number ?? ""} /></label>
      <label className="cv-maintenance-equipment-date">Instalação<DateInput name="installed_at" defaultValue={current?.installed_at ?? ""} /></label>
      <label className="cv-maintenance-equipment-date">Garantia até<DateInput name="warranty_until" defaultValue={current?.warranty_until ?? ""} /></label>
      {current && <label className="cv-maintenance-equipment-status">Situação<ContentSelect name="status" defaultValue={current.status}><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="retired">Desativado</option></ContentSelect></label>}
      <label className="cv-maintenance-equipment-notes">Observações<textarea name="notes" defaultValue={current?.notes ?? ""} rows={3} /></label>
    </div>
    <Button type="submit">{current ? "Salvar equipamento" : "Cadastrar equipamento"}</Button>
  </form>;
}
