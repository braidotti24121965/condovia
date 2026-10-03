import { saveStructure } from "@/lib/condominium/actions";

type Structure = { id: string; parent_id: string | null; name: string; code: string | null; structure_type: string; sort_order: number; status: string };
const options = [["block","Bloco"],["tower","Torre"],["sector","Setor"],["building","Edifício"],["wing","Ala"],["street","Rua"],["phase","Fase"],["other","Outro"]];

export function StructureForm({ structures, current }: { structures: Structure[]; current?: Structure }) {
  return <form action={saveStructure} className="cv-form">
    {current && <input type="hidden" name="id" value={current.id} />}
    <div className="cv-form-grid">
      <label>Tipo<select name="structure_type" defaultValue={current?.structure_type ?? "tower"}>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <label>Nome<input name="name" required minLength={1} defaultValue={current?.name} /></label>
      <label>Código (opcional)<input name="code" defaultValue={current?.code ?? ""} /></label>
      <label>Estrutura superior<select name="parent_id" defaultValue={current?.parent_id ?? ""}><option value="">Sem estrutura superior</option>{structures.filter((item)=>item.id!==current?.id && item.status==="active").map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Ordem<input name="sort_order" type="number" defaultValue={current?.sort_order ?? 0} /></label>
      {current && <label>Status<select name="status" defaultValue={current.status}><option value="active">Ativa</option><option value="inactive" disabled={current.status !== "inactive"}>Inativa — use a confirmação de inativação</option></select></label>}
    </div>
    <button className="button button-primary" type="submit">{current ? "Salvar estrutura" : "Criar estrutura"}</button>
  </form>;
}
