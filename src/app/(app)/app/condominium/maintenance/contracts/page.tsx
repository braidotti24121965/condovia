import { ContractFeedback } from "@/components/maintenance/contract-feedback";
import { ContractForm, type Contract } from "@/components/maintenance/contract-form";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { DocumentUpload } from "@/components/maintenance/management-ui";
import { civilDate, money } from "@/lib/maintenance/validation";
import { DocumentList } from "@/components/maintenance/document-list";

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
  return <div className="cv-page"><section className="page-heading"><div><h1>Contratos de manutenção</h1><p>Vigência, valores e documentos vinculados ao fornecedor. Contratos utilizados preservam seus dados históricos.</p></div></section><ContractFeedback key={params.updated ?? "initial"} params={error ? { error: "Não foi possível carregar contratos." } : params}>
    {canManage && <section className="cv-panel"><h2>Novo contrato</h2><ContractForm providers={providers} /></section>}
    <section className="cv-panel"><h2>Contratos cadastrados</h2>{!contracts?.length && <p>Nenhum contrato cadastrado.</p>}{(contracts as Contract[] ?? []).map(item => <details key={item.id} className="cv-maintenance-details"><summary>{item.title} · {civilDate(item.starts_on)} a {civilDate(item.ends_on)} · {money(item.amount)} · {item.status === "active" ? "Ativo" : item.status === "draft" ? "Rascunho" : "Encerrado"}</summary>
      {canManage && <ContractForm item={item} providers={providers} />}
      <h3>Documentação</h3><DocumentList target="contract" id={item.id} canUpload={canUpload === true} />{canUpload && <DocumentUpload target="contract" id={item.id} />}
    </details>)}</section>
  </ContractFeedback></div>;
}
