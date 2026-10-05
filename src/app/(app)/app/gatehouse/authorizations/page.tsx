import Link from "next/link";
import { ChevronRight, KeyRound, FileQuestion } from "lucide-react";
import { requireCurrentContext, requireUser } from "@/lib/auth/context";
import { EmptyState } from "@/components/ui/feedback";
import { GatehouseNav } from "@/components/gatehouse/gatehouse-nav";
import { AuthorizationForm } from "@/components/gatehouse/authorization-form";
import { RequestDecisionButtons } from "@/components/gatehouse/request-decision-button";
import {
  getAccessAuthorizations,
  getAccessRequests,
  getCondoUnits,
  getVisitors,
  getServiceProviders,
} from "@/lib/gatehouse/data";

export const metadata = { title: "Autorizações — Portaria" };

export default async function AuthorizationsPage() {
  const { supabase, user } = await requireUser();
  if (!supabase || !user) return null;
  const context = await requireCurrentContext();

  const [authorizations, requests, units, visitors, providers] = await Promise.all([
    getAccessAuthorizations(context.id),
    getAccessRequests(context.id),
    getCondoUnits(context.id),
    getVisitors(context.id),
    getServiceProviders(context.id),
  ]);

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="cv-page">
      <div className="breadcrumbs">
        <Link href="/app/dashboard">Início</Link>
        <ChevronRight size={14} />
        <Link href="/app/gatehouse">Portaria</Link>
        <ChevronRight size={14} />
        <strong>Autorizações e Solicitações</strong>
      </div>

      <section className="page-heading">
        <div>
          <p className="page-overline">AUTORIZAÇÕES DE ACESSO</p>
          <h1>Autorizações e Solicitações</h1>
          <p>Consulte autorizações prévias dos moradores e decida solicitações pendentes.</p>
        </div>
        <AuthorizationForm units={units} visitors={visitors} providers={providers} />
      </section>

      <GatehouseNav />

      {/* Solicitações Pendentes */}
      <section className="cv-panel">
        <div className="cv-panel-heading">
          <h2><FileQuestion size={18} /> Solicitações Aguardando Decisão ({pendingRequests.length})</h2>
          <p>Solicitações geradas na portaria para autorização do morador.</p>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="cv-muted" style={{ padding: "12px 0", textAlign: "center" }}>
            Nenhuma solicitação de acesso pendente.
          </p>
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Tipo</th>
                  <th>Unidade</th>
                  <th>Solicitado em</th>
                  <th>Observações</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((r) => {
                  const name = r.visitor?.full_name || r.service_provider?.full_name;
                  const type = r.visitor_id ? "Visitante" : "Prestador";
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{name}</strong>
                        {r.service_provider?.company_name && (
                          <small className="cv-muted">{r.service_provider.company_name}</small>
                        )}
                      </td>
                      <td><span className="cv-status">{type}</span></td>
                      <td>Unidade {r.unit?.code}</td>
                      <td>{new Date(r.requested_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td>{r.notes || "—"}</td>
                      <td>
                        <RequestDecisionButtons requestId={r.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Todas as Autorizações */}
      <section className="cv-panel">
        <div className="cv-panel-heading">
          <h2><KeyRound size={18} /> Autorizações Cadastradas ({authorizations.length})</h2>
          <p>Lista de liberações emitidas para visitantes e prestadores.</p>
        </div>

        {authorizations.length === 0 ? (
          <EmptyState
            title="Nenhuma autorização cadastrada"
            description="Quando moradores ou porteiros cadastrarem autorizações, elas aparecerão aqui."
          />
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Tipo</th>
                  <th>Unidade</th>
                  <th>Validade início</th>
                  <th>Validade fim</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {authorizations.map((a) => {
                  const name = a.visitor?.full_name || a.service_provider?.full_name;
                  const type = a.visitor_id ? "Visitante" : "Prestador";
                  const isExpired = new Date(a.valid_until) < new Date();
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{name}</strong>
                        {a.service_provider?.company_name && (
                          <small className="cv-muted">{a.service_provider.company_name}</small>
                        )}
                      </td>
                      <td><span className="cv-status">{type}</span></td>
                      <td>Unidade {a.unit?.code}</td>
                      <td>{new Date(a.valid_from).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td>{new Date(a.valid_until).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td>
                        <span className={`cv-status ${isExpired ? "cv-status-inactive" : "cv-status-active"}`}>
                          {isExpired ? "Expirada" : a.status === "approved" ? "Ativa" : a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
