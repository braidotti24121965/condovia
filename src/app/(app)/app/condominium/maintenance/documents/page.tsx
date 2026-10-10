import { ContentSelect } from "@/components/ui/form-controls";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { Feedback, DocumentUpload } from "@/components/maintenance/management-ui";
import { DocumentList } from "@/components/maintenance/document-list";
import { Button } from "@/components/ui/button";
import { validUuid } from "@/lib/maintenance/validation";
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string; target?: string; target_id?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.documents.read");
  const params = await searchParams;
  const [equipment, contracts, orders, quotations, canManage] = await Promise.all([
    supabase.from("maintenance_equipment").select("id,identification").eq("condominium_id", context.id),
    supabase.from("maintenance_contracts").select("id,title").eq("condominium_id", context.id),
    supabase.from("maintenance_work_orders").select("id,work_order_number").eq("condominium_id", context.id).order("created_at", { ascending: false }),
    supabase.from("maintenance_quotations").select("id,description").eq("condominium_id", context.id),
    supabase.rpc("has_permission", { permission_code: "maintenance.documents.manage", target_condominium_id: context.id }),
  ]);
  const target = ["contract", "work_order", "equipment", "quotation"].includes(params.target ?? "") ? params.target as "contract" | "work_order" | "equipment" | "quotation" : "equipment";
  const options = target === "equipment" ? (equipment.data ?? []).map(e => ({ id: e.id, name: e.identification })) : target === "contract" ? (contracts.data ?? []).map(c => ({ id: c.id, name: c.title })) : target === "quotation" ? (quotations.data ?? []).map(q => ({ id: q.id, name: q.description })) : (orders.data ?? []).map(o => ({ id: o.id, name: `OS #${o.work_order_number}` }));
  const selected = params.target_id && validUuid(params.target_id) && options.some(o => o.id === params.target_id) ? params.target_id : options[0]?.id;
  return <div className="cv-page"><section className="page-heading"><div><h1>Documentação da manutenção</h1><p>Contratos, propostas, laudos, notas, garantias e certificados com versões preservadas.</p></div></section><Feedback params={params} />
    <section className="cv-panel cv-document-destinations"><form method="get" className="cv-form cv-maintenance-inline-form"><label>Vincular a<ContentSelect name="target" defaultValue={target}><option value="equipment">Equipamento</option><option value="contract">Contrato</option><option value="work_order">Ordem de serviço</option><option value="quotation">Cotação</option></ContentSelect></label><Button type="submit" variant="secondary">Carregar destinos</Button></form>
      <form method="get" className="cv-form cv-maintenance-inline-form"><input type="hidden" name="target" value={target} /><label>Destino<ContentSelect name="target_id" defaultValue={selected}>{options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</ContentSelect></label><Button type="submit">Consultar documentos</Button></form>
    </section>
    {selected ? <section className="cv-panel"><h2>{options.find(o => o.id === selected)?.name}</h2><DocumentList target={target} id={selected} canUpload={canManage.data === true} notifyEmpty={Boolean(params.target_id)} />{canManage.data === true && <DocumentUpload target={target} id={selected} />}</section> : <section className="cv-panel"><p>Nenhum destino cadastrado. Cadastre primeiro um equipamento, contrato, OS ou cotação.</p></section>}
  </div>;
}
