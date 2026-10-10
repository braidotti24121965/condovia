import { requireCondominiumPermission } from "@/lib/condominium/access";
import { saveProvider } from "@/lib/maintenance/management-actions";
import { Feedback } from "@/components/maintenance/management-ui";
import { ProviderFields, type Provider } from "@/components/maintenance/provider-fields";

export default async function ProvidersPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("maintenance.contracts.manage");
  const { data: providers, error } = await supabase.from("service_providers").select("id,full_name,company_name,document_type,document_number,phone,email,address,service_type,status").eq("condominium_id", context.id).order("full_name");
  const params = await searchParams;
  return <div className="cv-page"><section className="page-heading"><div><h1>Fornecedores e prestadores</h1><p>Cadastro compartilhado com Portaria. Um fornecedor pode atender várias OS e contratos.</p></div></section>
    <Feedback params={error ? { error: "Não foi possível carregar os fornecedores." } : params} />
    <section className="cv-panel"><h2>Novo fornecedor</h2><form action={saveProvider} className="cv-form cv-form-grid"><ProviderFields /></form></section>
    <section className="cv-panel"><h2>Fornecedores cadastrados</h2>{!providers?.length && <p>Nenhum fornecedor cadastrado.</p>}{(providers as Provider[] ?? []).map(item => <details key={item.id} className="cv-maintenance-details"><summary>{item.full_name} · {item.company_name ?? item.service_type ?? "Prestador"} · {item.status === "active" ? "Ativo" : "Inativo"}</summary><form action={saveProvider} className="cv-form cv-form-grid"><ProviderFields item={item} /></form></details>)}</section>
  </div>;
}
