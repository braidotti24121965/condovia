import { Button } from "@/components/ui/button";
import { saveEquipment } from "@/lib/maintenance/actions";
import type { Equipment } from "@/lib/maintenance/types";

export function EquipmentForm({ structures, categories, current }: { structures: { id: string; name: string }[]; categories: { id: string; name: string }[]; current?: Equipment }) {
  return <form action={saveEquipment} className="cv-form">
    {current && <input type="hidden" name="id" value={current.id} />}
    <div className="cv-form-grid">
      <label className="cv-field-lg">Identificação<input name="identification" required defaultValue={current?.identification} placeholder="Ex.: Bomba de recalque 01" /></label>
      <label className="cv-field-lg">Estrutura<select name="structure_id" required defaultValue={current?.structure_id ?? ""}><option value="">Selecione</option>{structures.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="cv-field-md">Categoria<select name="category_id" defaultValue={current?.maintenance_equipment_categories ? "" : ""}><option value="">Sem categoria</option>{categories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="cv-field-md">Localização<input name="location" defaultValue={current?.location ?? ""} /></label>
      <label className="cv-field-md">Fabricante<input name="manufacturer" defaultValue={current?.manufacturer ?? ""} /></label>
      <label className="cv-field-md">Modelo<input name="model" defaultValue={current?.model ?? ""} /></label>
      <label className="cv-field-md">Número de série<input name="serial_number" defaultValue={current?.serial_number ?? ""} /></label>
      <label className="cv-field-sm">Instalação<input name="installed_at" type="date" defaultValue={current?.installed_at ?? ""} /></label>
      <label className="cv-field-sm">Garantia até<input name="warranty_until" type="date" defaultValue={current?.warranty_until ?? ""} /></label>
      {current && <label className="cv-field-sm">Situação<select name="status" defaultValue={current.status}><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="retired">Desativado</option></select></label>}
      <label className="cv-field-full">Observações<textarea name="notes" defaultValue="" rows={3} /></label>
    </div>
    <Button type="submit">{current ? "Salvar equipamento" : "Cadastrar equipamento"}</Button>
  </form>;
}
