import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { ProviderForm } from "@/components/gatehouse/provider-form";
import { getServiceProviders } from "@/lib/gatehouse/data";

export const metadata = { title: "Prestadores — Portaria" };

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();
  const { q } = await searchParams;

  const providers = await getServiceProviders(context.id, q);

  return (
    <div className="cv-page">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Prestadores de Serviço</strong>
      </div>

      <section className="page-heading">
        <div>
          <p className="page-overline">CADASTRO DE PRESTADORES</p>
          <h1>Prestadores de Serviço</h1>
          <p>Profissionais terceirizados, empresas e prestadores com liberação de acesso.</p>
        </div>
        <ProviderForm />
      </section>

      <GatehouseNav />

      <section className="cv-panel">
        <form method="GET" className="cv-filters">
          <div className="cv-search">
            <Search size={16} />
            <input
              name="q"
              defaultValue={q || ""}
              placeholder="Buscar por profissional, empresa ou tipo de serviço..."
              aria-label="Buscar prestador"
            />
          </div>
          <button type="submit" className="button button-secondary">Buscar</button>
        </form>

        {providers.length === 0 ? (
          <EmptyState
            title="Nenhum prestador encontrado"
            description={q ? `Nenhum resultado para "${q}".` : "Nenhum prestador cadastrado no condomínio até o momento."}
          />
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Empresa</th>
                  <th>Especialidade</th>
                  <th>Documento</th>
                  <th>Telefone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.full_name}</strong></td>
                    <td>{p.company_name || "—"}</td>
                    <td>{p.service_type || "Geral"}</td>
                    <td>{p.document_number ? `${p.document_type?.toUpperCase() || "DOC"}: ${p.document_number}` : "—"}</td>
                    <td>{p.phone || "—"}</td>
                    <td>
                      <span className={`cv-status cv-status-${p.status}`}>
                        {p.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
