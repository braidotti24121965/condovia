import { requireCondominiumPermission } from "@/lib/condominium/access";
import { saveProvider } from "@/lib/maintenance/management-actions";
import { Feedback } from "@/components/maintenance/management-ui";
import { Button } from "@/components/ui/button";

type Provider = { id: string; full_name: string; company_name: string | null; document_type: string | null; document_number: string | null; phone: string | null; email: string | null; address: string | null; service_type: string | null; status: string };
function ProviderFields({ item }: { item?: Provider }) {
  return <>{item && <input type="hidden" name="id" value={item.id} />}
    <label className="cv-field-md">Nome do profissional ou fornecedor<input name="full_name" defaultValue={item?.full_name} required minLength={2} maxLength={180} /></label>
    <label className="cv-field-md">Empresa / razão social<input name="company_name" defaultValue={item?.company_name ?? ""} /></label>
    <label className="cv-field-sm">Documento<select name="document_type" defaultValue={item?.document_type ?? "cnpj"}><option value="cnpj">CNPJ</option><option value="cpf">CPF</option><option value="rg">RG</option><option value="cnh">CNH</option><option value="other">Outro</option></select></label>
    <label className="cv-field-md">Número do documento<input name="document_number" defaultValue={item?.document_number ?? ""} maxLength={30} /></label>
    <label className="cv-field-md">Telefone<input name="phone" type="tel" defaultValue={item?.phone ?? ""} /></label>
    <label className="cv-field-md">E-mail<input name="email" type="email" defaultValue={item?.email ?? ""} /></label>
    <label className="cv-form-wide">Endereço<input name="address" defaultValue={item?.address ?? ""} /></label>
    <label className="cv-field-md">Especialidade<input name="service_type" defaultValue={item?.service_type ?? ""} /></label>
    <label className="cv-field-sm">Situação<select name="status" defaultValue={item?.status ?? "active"}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>
    <Button type="submit">{item ? "Salvar fornecedor" : "Cadastrar fornecedor"}</Button>
  </>;
}
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
