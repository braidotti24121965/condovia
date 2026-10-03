import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Pencil, MapPin } from "lucide-react";
import { requireCondominiumPermission } from "@/lib/condominium/access";
import { saveCondominiumProfile } from "@/lib/condominium/actions";
import { Alert } from "@/components/ui/feedback";
import { friendlyDatabaseError } from "@/lib/condominium/format";

export const metadata = { title: "Visão geral do condomínio" };
const types: Record<string,string> = { vertical:"Vertical", horizontal:"Horizontal", mixed:"Misto", other:"Outro" };

export default async function CondominiumOverview({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { supabase, context } = await requireCondominiumPermission("condominium.read");
  const structureCount = async () => {
    const { data: allowed } = await supabase.rpc("has_permission", { permission_code: "structures.read", target_condominium_id: context.id });
    if (allowed !== true) return null;
    const { count } = await supabase.from("condominium_structures").select("id", { count: "exact", head: true }).eq("condominium_id", context.id);
    return count;
  };
  const unitCount = async () => {
    const { data: allowed } = await supabase.rpc("has_permission", { permission_code: "units.read", target_condominium_id: context.id });
    if (allowed !== true) return null;
    const { count } = await supabase.from("units").select("id", { count: "exact", head: true }).eq("condominium_id", context.id);
    return count;
  };
  const [{ data, error }, params, { data: canManage }, structuresCount, unitsCount] = await Promise.all([
    supabase.from("condominiums").select("id,name,status,legal_name,document_number,email,phone,condominium_type,timezone,addresses(id,postal_code,street,number,complement,district,city,state,country_code)").eq("id", context.id).maybeSingle(),
    searchParams,
    supabase.rpc("has_permission", { permission_code: "condominiums.manage", target_condominium_id: context.id }),
    structureCount(), unitCount(),
  ]);
  if (error) return <div className="cv-page"><Alert tone="error">{friendlyDatabaseError(error.message)}</Alert></div>;
  if (!data) notFound();
  const address = data.addresses as unknown as { postal_code: string | null; street: string; number: string | null; complement: string | null; district: string | null; city: string; state: string; country_code: string } | null;
  return <div className="cv-page">
    <div className="breadcrumbs"><Link href="/app/dashboard">Início</Link><ChevronRight size={14}/><strong>Condomínio</strong></div>
    <section className="page-heading"><div><p className="page-overline">CONDOMÍNIO</p><h1>Visão geral</h1><p>Dados cadastrais e configurações de {context.name}.</p></div><span className={`cv-status cv-status-${data.status}`}>{data.status === "active" ? "Ativo" : data.status === "suspended" ? "Suspenso" : "Encerrado"}</span></section>
    {params.saved && <Alert tone="success">Dados do condomínio salvos.</Alert>}{params.error && <Alert tone="error">{params.error}</Alert>}
    <section className="cv-stat-grid" aria-label="Resumo do condomínio"><article><span>Estruturas</span><strong>{structuresCount ?? "—"}</strong></article><article><span>Unidades</span><strong>{unitsCount ?? "—"}</strong></article><article><span>Tipo</span><strong>{types[data.condominium_type] ?? "Outro"}</strong></article></section>
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2><Pencil size={18}/> Dados gerais e contato</h2><p>Informações administrativas do condomínio</p></div></div>
      {canManage ? <form action={saveCondominiumProfile} className="cv-form">
        <div className="cv-form-section"><h3>Dados gerais</h3><div className="cv-form-grid">
          <label>Nome do condomínio<input name="name" required defaultValue={data.name}/></label><label>Razão social<input name="legal_name" defaultValue={data.legal_name ?? ""}/></label>
          <label>CNPJ<input name="document_number" inputMode="numeric" placeholder="00.000.000/0000-00" defaultValue={data.document_number ?? ""}/></label><label>Tipo<select name="condominium_type" defaultValue={data.condominium_type}><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="mixed">Misto</option><option value="other">Outro</option></select></label>
        </div></div>
        <div className="cv-form-section"><h3>Contato</h3><div className="cv-form-grid"><label>E-mail<input name="email" type="email" defaultValue={data.email ?? ""}/></label><label>Telefone<input name="phone" type="tel" defaultValue={data.phone ?? ""}/></label></div></div>
        <div className="cv-form-section"><h3><MapPin size={17}/> Endereço (opcional)</h3><div className="cv-form-grid">
          <label>CEP<input name="postal_code" inputMode="numeric" defaultValue={address?.postal_code ?? ""}/></label><label>Logradouro<input name="street" defaultValue={address?.street ?? ""}/></label><label>Número<input name="number" defaultValue={address?.number ?? ""}/></label><label>Complemento<input name="complement" defaultValue={address?.complement ?? ""}/></label><label>Bairro<input name="district" defaultValue={address?.district ?? ""}/></label><label>Cidade<input name="city" defaultValue={address?.city ?? ""}/></label><label>Estado<input name="state" maxLength={60} defaultValue={address?.state ?? ""}/></label><label>País (código)<input name="country_code" required maxLength={2} defaultValue={address?.country_code ?? "BR"}/></label>
        </div><p className="cv-form-hint">Se informar um logradouro, cidade e estado também são obrigatórios. O CEP brasileiro deve ter 8 dígitos.</p></div>
        <div className="cv-form-section"><h3>Configurações</h3><div className="cv-form-grid"><label>Fuso horário IANA<input name="timezone" required defaultValue={data.timezone}/></label></div></div>
        <button className="button button-primary" type="submit">Salvar alterações</button>
      </form> : <div className="cv-read-grid"><p><span>Nome</span><strong>{data.name}</strong></p><p><span>Razão social</span><strong>{data.legal_name || "Não informado"}</strong></p><p><span>Documento</span><strong>{data.document_number || "Não informado"}</strong></p><p><span>E-mail</span><strong>{data.email || "Não informado"}</strong></p><p><span>Telefone</span><strong>{data.phone || "Não informado"}</strong></p><p><span>Fuso horário</span><strong>{data.timezone}</strong></p><p className="cv-read-wide"><span>Endereço</span><strong>{address ? [address.street, address.number, address.complement, address.district, address.city, address.state, address.postal_code].filter(Boolean).join(", ") : "Não informado"}</strong></p></div>}
    </section>
  </div>;
}
