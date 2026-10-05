"use client";

import { useState } from "react";
import { KeyRound, FileQuestion, Package as PackageIcon } from "lucide-react";
import { RequestDecisionButtons } from "@/components/gatehouse/request-decision-button";
import { AuthorizationForm } from "@/components/gatehouse/authorization-form";
import type { AccessAuthorization, AccessRequest, Package, Visitor, ServiceProvider } from "@/lib/gatehouse/types";

interface Props {
  units: { id: string; code: string; display_name: string | null }[];
  visitors: Visitor[];
  providers: ServiceProvider[];
  authorizations: AccessAuthorization[];
  requests: AccessRequest[];
  packages: Package[];
}

export function ResidentGatehouseSection({
  units,
  visitors,
  providers,
  authorizations,
  requests,
  packages,
}: Props) {
  const [tab, setTab] = useState<"authorizations" | "requests" | "packages">("requests");

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const waitingPackages = packages.filter((p) => p.status === "received");
  const collectedPackages = packages.filter((p) => p.status === "collected");

  return (
    <div style={{ marginTop: "24px" }} className="cv-panel">
      <div className="cv-panel-heading">
        <div>
          <h2>Portaria e Acessos das Minhas Unidades</h2>
          <p>Gerencie autorizações, decida solicitações na portaria e acompanhe encomendas.</p>
        </div>
        <AuthorizationForm units={units} visitors={visitors} providers={providers} residentMode />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--cv-border)", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={`cv-gatehouse-nav-item ${tab === "requests" ? "active" : ""}`}
        >
          <FileQuestion size={16} />
          <span>Solicitações Pendentes ({pendingRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("authorizations")}
          className={`cv-gatehouse-nav-item ${tab === "authorizations" ? "active" : ""}`}
        >
          <KeyRound size={16} />
          <span>Minhas Autorizações ({authorizations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("packages")}
          className={`cv-gatehouse-nav-item ${tab === "packages" ? "active" : ""}`}
        >
          <PackageIcon size={16} />
          <span>Minhas Encomendas ({waitingPackages.length} aguardando)</span>
        </button>
      </div>

      {/* Tab: Solicitações */}
      {tab === "requests" && (
        <div>
          {pendingRequests.length === 0 ? (
            <p className="cv-muted" style={{ padding: "16px 0", textAlign: "center" }}>
              Nenhuma solicitação de acesso aguardando sua autorização.
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
                    <th>Sua Decisão</th>
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
        </div>
      )}

      {/* Tab: Autorizações */}
      {tab === "authorizations" && (
        <div>
          {authorizations.length === 0 ? (
            <p className="cv-muted" style={{ padding: "16px 0", textAlign: "center" }}>
              Nenhuma autorização cadastrada para suas unidades. Use o botão acima para autorizar visitantes.
            </p>
          ) : (
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th>Tipo</th>
                    <th>Unidade</th>
                    <th>Início</th>
                    <th>Validade</th>
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
                            {isExpired ? "Expirada" : "Ativa"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Encomendas */}
      {tab === "packages" && (
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--cv-brand-navy)", marginBottom: "12px" }}>
            Aguardando Retirada na Portaria ({waitingPackages.length})
          </h3>
          {waitingPackages.length === 0 ? (
            <p className="cv-muted" style={{ padding: "8px 0 16px", textAlign: "center" }}>
              Nenhuma encomenda aguardando retirada para sua unidade.
            </p>
          ) : (
            <div className="cv-table-wrap" style={{ marginBottom: "20px" }}>
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Unidade</th>
                    <th>Transportadora</th>
                    <th>Recebida na portaria</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingPackages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td><strong>{pkg.description}</strong></td>
                      <td>Unidade {pkg.unit?.code}</td>
                      <td>{pkg.carrier || "—"}</td>
                      <td>{new Date(pkg.received_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td>{pkg.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {collectedPackages.length > 0 && (
            <>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--cv-brand-navy)", marginBottom: "12px" }}>
                Histórico de Encomendas Retiradas
              </h3>
              <div className="cv-table-wrap">
                <table className="cv-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Unidade</th>
                      <th>Entregue a</th>
                      <th>Data de Retirada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collectedPackages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td><strong>{pkg.description}</strong></td>
                        <td>Unidade {pkg.unit?.code}</td>
                        <td>{pkg.collection?.collector_name || "Titular / Morador"}</td>
                        <td>
                          {pkg.collection?.collected_at
                            ? new Date(pkg.collection.collected_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
