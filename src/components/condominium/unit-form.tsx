import { saveUnit } from "@/lib/condominium/actions";

type Structure = { id: string; name: string; status: string };
type Unit = { id: string; structure_id: string | null; code: string; display_name: string | null; unit_type: string; floor: string | null; area: number | null; ownership_fraction: number | null; operational_status: string; notes: string | null };
const types = [["apartment","Apartamento"],["house","Casa"],["lot","Lote"],["commercial","Comercial"],["office","Escritório"],["store","Loja"],["other","Outra"]];

export function UnitForm({ structures, current }: { structures: Structure[]; current?: Unit }) {
  return <form action={saveUnit} className="cv-form">
    {current && <input type="hidden" name="id" value={current.id} />}
    <div className="cv-form-grid">
      <label>Código<input name="code" required defaultValue={current?.code} /></label>
      <label>Nome de exibição (opcional)<input name="display_name" defaultValue={current?.display_name ?? ""} /></label>
      <label>Tipo<select name="unit_type" defaultValue={current?.unit_type ?? "apartment"}>{types.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Estrutura<select name="structure_id" defaultValue={current?.structure_id ?? ""}><option value="">Sem estrutura</option>{structures.filter((s)=>s.status==="active").map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Andar<input name="floor" defaultValue={current?.floor ?? ""} /></label>
      <label>Área (m²)<input name="area" type="number" min="0.01" step="0.01" defaultValue={current?.area ?? ""} /></label>
      <label>Fração ideal (%)<input name="ownership_fraction" type="number" min="0" max="100" step="0.000001" defaultValue={current?.ownership_fraction ?? ""} /></label>
      {current && <label>Status<select name="operational_status" defaultValue={current.operational_status}><option value="active">Ativa</option><option value="inactive" disabled={current.operational_status !== "inactive"}>Inativa — use a confirmação de inativação</option><option value="under_construction">Em construção</option><option value="blocked">Bloqueada</option></select></label>}
      <label className="cv-form-wide">Observações<textarea name="notes" rows={3} defaultValue={current?.notes ?? ""} /></label>
    </div>
    <button className="button button-primary" type="submit">{current ? "Salvar unidade" : "Criar unidade"}</button>
  </form>;
}
