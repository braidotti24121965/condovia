import Link from "next/link";
import { Building2, ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requirePlatformPermission } from "@/lib/platform/access";
import { beginPlatformTenantContext } from "@/lib/auth/actions";

type TenantRow = { client_id:string;client_legal_name:string;client_status:string;condominium_id:string;condominium_name:string;condominium_status:string;condominium_type:string;created_at:string };

export const metadata = { title: "Administração da plataforma" };

export default async function PlatformPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { supabase } = await requirePlatformPermission("platform.condominiums.read");
  const [{ data, error }, params] = await Promise.all([supabase.rpc("list_platform_tenants"), searchParams]);
  const tenants = (data ?? []) as TenantRow[];
  return <div className="cv-page">
    <div className="breadcrumbs"><span>Plataforma</span><ChevronRight size={14}/><strong>Tenants</strong></div>
    <section className="page-heading"><div><p className="page-overline">ADMINISTRAÇÃO SAAS</p><h1>CondoVia</h1><p>Gerencie os tenants e o ciclo inicial de acesso.</p></div><Link className="button button-primary" href="/app/platform/tenants/new"><Plus size={16}/> Novo tenant</Link></section>
    {params.saved && <Alert tone="success">Tenant criado e convite do síndico enviado.</Alert>}
    {params.error && <Alert tone="error">Não foi possível acessar este tenant.</Alert>}
    {error && <Alert tone="error">Não foi possível carregar os tenants.</Alert>}
    <section className="cv-stat-grid" aria-label="Resumo da plataforma"><article><span>Tenants</span><strong>{tenants.length}</strong></article><article><span>Contexto</span><strong>Plataforma</strong></article><article><span>Acesso</span><strong><ShieldCheck size={18}/> Protegido</strong></article></section>
    <section className="cv-panel"><div className="cv-panel-heading"><div><h2><Building2 size={18}/> Condomínios</h2><p>Tenants cadastrados na plataforma</p></div></div>
      {tenants.length===0 ? <EmptyState title="Nenhum tenant cadastrado" description="Use Novo tenant para iniciar o primeiro condomínio."/> :
        <div className="context-list">{tenants.map((tenant)=><article className="context-option" key={tenant.condominium_id}><span className="context-option-icon">C</span><span className="context-option-copy"><strong>{tenant.condominium_name}</strong><small>{tenant.client_legal_name}</small></span><span className="role-badge">{tenant.condominium_status}</span><form action={beginPlatformTenantContext}><input type="hidden" name="condominiumId" value={tenant.condominium_id} /><button className="button button-secondary" type="submit">Acessar condomínio</button></form></article>)}</div>}
    </section>
  </div>;
}
