import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { VisitorForm } from "@/components/gatehouse/visitor-form";
import { getVisitors } from "@/lib/gatehouse/data";
import { formatBrazilianCpf, formatBrazilianPhone } from "@/lib/condominium/format";

export const metadata = { title: "Visitantes — Portaria" };

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();
  const { q } = await searchParams;

  const visitors = await getVisitors(context.id, q);

  return (
    <div className="cv-page gatehouse-v2">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Visitantes</strong>
      </div>

      <section className="v2-page-header">
        <div>
          <p className="page-overline">CADASTRO DE VISITANTES</p>
          <h1>Visitantes</h1>
          <p>Consulte e cadastre visitantes com identificação e histórico de contato.</p>
        </div>
        <VisitorForm />
      </section>

      <GatehouseNav />

      <section className="cv-panel v2-panel gatehouse-list-panel">
        <div className="v2-panel-heading"><div><h2>Visitantes cadastrados</h2><p>Identidades disponíveis para autorizações e controle de acesso.</p></div></div><form method="GET" className="cv-filters gatehouse-filters">
          <div className="cv-search">
            <Search size={16} />
            <input
              name="q"
              defaultValue={q || ""}
              placeholder="Buscar por nome, documento ou telefone..."
              aria-label="Buscar visitante"
            />
          </div>
          <button type="submit" className="button button-outline">Buscar</button>
        </form>

        {visitors.length === 0 ? (
          <EmptyState
            title="Nenhum visitante encontrado"
            description={q ? `Nenhum resultado para "${q}".` : "Nenhum visitante cadastrado no condomínio até o momento."}
          />
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Nome completo</th>
                  <th>Documento</th>
                  <th>Telefone</th>
                  <th>Observações</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.full_name}</strong></td>
                    <td>{v.document_number ? `${v.document_type?.toUpperCase() || "DOC"}: ${v.document_type?.toLowerCase() === "cpf" ? formatBrazilianCpf(v.document_number) : v.document_number}` : "—"}</td>
                    <td>{v.phone ? formatBrazilianPhone(v.phone) : "—"}</td>
                    <td>{v.notes || "—"}</td>
                    <td>
                      <span className={`cv-status cv-status-${v.status}`}>
                        {v.status === "active" ? "Ativo" : "Inativo"}
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
