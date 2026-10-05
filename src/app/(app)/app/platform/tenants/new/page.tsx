import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { createTenant } from "@/lib/platform/actions";
import { requirePlatformPermission } from "@/lib/platform/access";

export const metadata = { title: "Novo tenant" };

export default async function NewTenantPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePlatformPermission("platform.tenants.onboard");
  const { error } = await searchParams;
  return <div className="cv-page">
    <div className="breadcrumbs"><Link href="/app/platform"><ChevronLeft size={14}/> Plataforma</Link><strong>Novo tenant</strong></div>
    <section className="page-heading"><div><p className="page-overline">ONBOARDING</p><h1>Cadastrar tenant</h1><p>Crie o cliente, o condomínio e prepare o convite do síndico inicial.</p></div><span className="role-badge"><ShieldCheck size={15}/> platform.admin</span></section>
    {error && <Alert tone="error">Não foi possível concluir o onboarding. Revise os dados e tente novamente.</Alert>}
    <section className="cv-panel"><form action={createTenant} className="cv-form">
      <div className="cv-form-section"><h3>Cliente</h3><div className="cv-form-grid"><label className="cv-field-lg">Nome legal do cliente<input name="client_legal_name" required/></label></div></div>
      <div className="cv-form-section"><h3>Condomínio</h3><div className="cv-form-grid">
        <label className="cv-field-lg">Nome<input name="condominium_name" required/></label><label className="cv-field-lg">Razão social<input name="condominium_legal_name"/></label>
        <label className="cv-field-md">CNPJ<input name="document_number" inputMode="numeric"/></label><label>Tipo<select name="condominium_type" defaultValue="other"><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="mixed">Misto</option><option value="other">Outro</option></select></label>
        <label className="cv-field-lg">Email institucional<input name="condominium_email" type="email"/></label><label className="cv-field-md">Telefone<input name="condominium_phone" type="tel"/></label>
        <label className="cv-field-lg">Fuso horário IANA<input name="timezone" required defaultValue="America/Sao_Paulo"/></label>
      </div></div>
      <div className="cv-form-section"><h3>Endereço (opcional)</h3><div className="cv-form-grid">
        <label className="cv-field-sm">CEP<input name="postal_code" inputMode="numeric"/></label><label className="cv-field-lg">Logradouro<input name="street"/></label><label className="cv-field-xs">Número<input name="number"/></label>
        <label className="cv-field-md">Complemento<input name="complement"/></label><label className="cv-field-md">Bairro<input name="district"/></label><label className="cv-field-md">Cidade<input name="city"/></label>
        <label className="cv-field-sm">Estado<input name="state"/></label><label className="cv-field-xs">País<input name="country_code" defaultValue="BR" maxLength={2}/></label>
      </div><p className="cv-form-hint">Se qualquer endereço for informado, logradouro, cidade e estado serão obrigatórios.</p></div>
      <div className="cv-form-section"><h3>Administrador inicial</h3><div className="cv-form-grid">
        <label className="cv-field-lg">Nome completo<input name="admin_name" required/></label><label className="cv-field-lg">Email<input name="admin_email" type="email" required/></label><label className="cv-field-md">Telefone (opcional)<input name="admin_phone" type="tel"/></label>
      </div><p className="cv-form-hint">O convidado ativará as próprias credenciais e receberá exclusivamente a role condominium.syndic.</p></div>
      <button className="button button-primary" type="submit">Criar tenant e enviar convite</button>
    </form></section>
  </div>;
}
