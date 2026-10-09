import { requireCondominiumPermission } from "@/lib/condominium/access";
import { saveContract } from "@/lib/maintenance/management-actions";
import { DocumentUpload, Feedback, MoneyField, SelectField, type NamedOption } from "@/components/maintenance/management-ui";
import { Button } from "@/components/ui/button";
import { civilDate, money } from "@/lib/maintenance/validation";
import { DocumentList } from "@/components/maintenance/document-list";

type Contract = { id: string; service_provider_id: string; title: string; starts_on: string; ends_on: string; amount: number; status: string; notes: string | null };
function ContractFields({ providers, item }: { providers: NamedOption[]; item?: Contract }) {
  return <>{item && <input type="hidden" name="id" value={item.id} />}<SelectField label="Fornecedor" name="service_provider_id" options={providers} selected={item?.service_provider_id} required />
    <label className="cv-field-md">Título do contrato<input name="title" defaultValue={item?.title} required minLength={3} maxLength={180} /></label>
    <label className="cv-field-date">Início<input name="starts_on" type="date" required defaultValue={item?.starts_on} /></label><label className="cv-field-date">Término<input name="ends_on" type="date" required defaultValue={item?.ends_on} /></label>
    <MoneyField label="Valor total (R$)" name="amount" value={item?.amount} />
    <label className="cv-field-sm">Situação<select name="status" defaultValue={item?.status ?? "draft"}><option value="draft">Rascunho</option><option value="active">Ativo</option><option value="expired">Encerrado</option><option value="cancelled">Cancelado</option></select></label>
    <label className="cv-form-wide">Observações<textarea name="notes" rows={3} defaultValue={item?.notes ?? ""} /></label><Button type="submit">Salvar contrato</Button></>;
}
export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.finance.read");
  const [{ data: contracts, error }, { data: rawProviders }, { data: canManage }, { data: canUpload }] = await Promise.all([
    supabase.from("maintenance_contracts").select("*").eq("condominium_id", context.id).order("ends_on"),
    supabase.from("service_providers").select("id,full_name").eq("condominium_id", context.id).eq("status", "active"),
    supabase.rpc("has_permission", { permission_code: "maintenance.contracts.manage", target_condominium_id: context.id }),
    supabase.rpc("has_permission", { permission_code: "maintenance.documents.manage", target_condominium_id: context.id }),
  ]);
  const providers = (rawProviders ?? []).map(p => ({ id: p.id, name: p.full_name }));
  const params = await searchParams;
  return <div className="cv-page"><section className="page-heading"><div><h1>Contratos de manutenção</h1><p>Vigência, valores e documentos vinculados ao fornecedor. Contratos utilizados preservam seus dados históricos.</p></div></section><Feedback params={error ? { error: "Não foi possível carregar contratos." } : params} />
    {canManage && <section className="cv-panel"><h2>Novo contrato</h2><form action={saveContract} className="cv-form cv-form-grid"><ContractFields providers={providers} /></form></section>}
    <section className="cv-panel"><h2>Contratos cadastrados</h2>{!contracts?.length && <p>Nenhum contrato cadastrado.</p>}{(contracts as Contract[] ?? []).map(item => <details key={item.id} className="cv-maintenance-details"><summary>{item.title} · {civilDate(item.starts_on)} a {civilDate(item.ends_on)} · {money(item.amount)} · {item.status === "active" ? "Ativo" : item.status === "draft" ? "Rascunho" : "Encerrado"}</summary>
      {canManage && <form action={saveContract} className="cv-form cv-form-grid"><ContractFields item={item} providers={providers} /></form>}
      <h3>Documentação</h3><DocumentList target="contract" id={item.id} canUpload={canUpload === true} />{canUpload && <DocumentUpload target="contract" id={item.id} />}
    </details>)}</section>
  </div>;
}
