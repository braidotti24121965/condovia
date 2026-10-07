import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { ProviderForm } from "@/components/gatehouse/provider-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getServiceProviders } from "@/lib/gatehouse/data";
import { formatBrazilianCpf, formatBrazilianPhone } from "@/lib/condominium/format";

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
    <div className="cv-page gatehouse-v2">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Prestadores de Serviço</strong>
      </div>

      <section className="v2-page-header">
        <div>
          <p className="page-overline">CADASTRO DE PRESTADORES</p>
          <h1>Prestadores de Serviço</h1>
          <p>Profissionais terceirizados, empresas e prestadores com liberação de acesso.</p>
        </div>
        <ProviderForm />
      </section>

      <GatehouseNav />

      <section className="cv-panel v2-panel gatehouse-list-panel">
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
          <Button type="submit" variant="secondary">Buscar</Button>
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
                    <td>{p.document_number ? `${p.document_type?.toUpperCase() || "DOC"}: ${p.document_type?.toLowerCase() === "cpf" ? formatBrazilianCpf(p.document_number) : p.document_number}` : "—"}</td>
                    <td>{p.phone ? formatBrazilianPhone(p.phone) : "—"}</td>
                    <td>
                      <StatusBadge variant={p.status === "active" ? "success" : "neutral"}>
                        {p.status === "active" ? "Ativo" : "Inativo"}
                      </StatusBadge>
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
