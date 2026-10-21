"use client";

import { useState, useTransition } from "react";
import { Check, FileQuestion, KeyRound, Package as PackageIcon, QrCode, RefreshCw, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestDecisionButtons } from "@/components/gatehouse/request-decision-button";
import { AuthorizationForm } from "@/components/gatehouse/authorization-form";
import { AuthorizationQrModal, type AuthorizationQrData } from "@/components/gatehouse/authorization-qr-modal";
import { formatDateTimeInTimezone, formatTimeInTimezone, getAuthorizationOperationalStatus } from "@/lib/gatehouse/timezone";
import type { AccessAuthorization, AccessRequest, Package, Visitor, ServiceProvider } from "@/lib/gatehouse/types";
import { getPackagePickupCodeAction } from "@/lib/gatehouse/actions";
import { Ecc, QrCode as QrCodeGenerator } from "@/lib/gatehouse/qrcode";

interface Props {
  units: { id: string; code: string; display_name: string | null }[];
  visitors: Visitor[];
  providers: ServiceProvider[];
  authorizations: AccessAuthorization[];
  requests: AccessRequest[];
  packages: Package[];
  timeZone?: string;
  condoName?: string;
}

export function ResidentGatehouseSection({
  units,
  visitors,
  providers,
  authorizations,
  requests,
  packages,
  timeZone = "America/Sao_Paulo",
  condoName,
}: Props) {
  const [tab, setTab] = useState<"authorizations" | "requests" | "packages">("requests");
  const [viewingQrAuth, setViewingQrAuth] = useState<AuthorizationQrData | null>(null);
  const [viewingPackage, setViewingPackage] = useState<Package | null>(null);

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
        <AuthorizationForm units={units} visitors={visitors} providers={providers} residentMode timeZone={timeZone} condoName={condoName} />
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
                    <th>Ações</th>
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
                        <td>{formatTimeInTimezone(r.requested_at, timeZone)}</td>
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
                    <th>QR Code</th>
                  </tr>
                </thead>
                <tbody>
                  {authorizations.map((a) => {
                    const name = a.visitor?.full_name || a.service_provider?.full_name;
                    const type = a.visitor_id ? "Visitante" : "Prestador";
                    const opStatus = getAuthorizationOperationalStatus(a.valid_from, a.valid_until);
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
                        <td>{formatDateTimeInTimezone(a.valid_from, timeZone)}</td>
                        <td>{formatDateTimeInTimezone(a.valid_until, timeZone)}</td>
                        <td>
                          <span className={`cv-status cv-status-${opStatus.tone}`}>
                            {opStatus.label}
                          </span>
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="secondary"
                            size="compact"
                            onClick={() =>
                              setViewingQrAuth({
                                id: a.id,
                                visitorName: name || "Visitante",
                                unitCode: a.unit?.code || "",
                                condoName,
                                validFrom: a.valid_from,
                                validUntil: a.valid_until,
                                timeZone,
                              })
                            }
                          >
                            <QrCode size={14} /> Ver QR
                          </Button>
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
                      <td>{formatDateTimeInTimezone(pkg.received_at, timeZone)}</td>
                        <td>{pkg.notes || "—"}</td>
                        <td>
                          <Button type="button" variant="secondary" size="compact" onClick={() => setViewingPackage(pkg)}>
                            <QrCode size={14} /> Ver QR de retirada
                          </Button>
                        </td>
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
                        ? formatDateTimeInTimezone(pkg.collection.collected_at, timeZone)
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

      <AuthorizationQrModal
        open={Boolean(viewingQrAuth)}
        onClose={() => setViewingQrAuth(null)}
        authorization={viewingQrAuth}
      />
      <PackagePickupQrModal
        open={Boolean(viewingPackage)}
        onClose={() => setViewingPackage(null)}
        packageData={viewingPackage}
        timeZone={timeZone}
        condoName={condoName}
      />
    </div>
  );
}

function PackagePickupQrModal({ open, onClose, packageData, timeZone, condoName }: { open: boolean; onClose: () => void; packageData: Package | null; timeZone: string; condoName?: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  if (!open || !packageData) return null;
  const qr = code ? QrCodeGenerator.encodeText(code, Ecc.MEDIUM).toDataUrl() : null;
  const formattedExpiry = expiresAt ? formatDateTimeInTimezone(expiresAt, timeZone) : "";
  const whatsappUrl = code ? `https://wa.me/?text=${encodeURIComponent(`*Código de retirada - CondoVia*\nEncomenda: *${packageData.description}*\nUnidade: *${packageData.unit?.code || "—"}*\nVálido até: *${formattedExpiry}*\n\nCódigo: ${code}`)}` : null;
  const generate = () => startGenerating(async () => {
    const result = await getPackagePickupCodeAction(packageData.id);
    if ("error" in result) { setError(result.error ?? "Não foi possível gerar o código."); return; }
    setError(null); setCode(result.code); setExpiresAt(result.expiresAt);
  });
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="package-qr-title" className="cv-modal-backdrop">
      <div className="cv-panel cv-modal-panel">
        <div className="cv-panel-heading">
          <h2 id="package-qr-title"><QrCode size={20} /> QR de retirada</h2>
          <Button variant="icon" type="button" aria-label="Fechar" onClick={onClose}><X size={18} /></Button>
        </div>
        <p className="cv-muted">O código vale por 7 dias e não é armazenado no banco.</p>
        {error ? <p role="alert" className="cv-field-error">{error}</p> : null}
        {qr ? <img src={qr} alt="QR Code do código de retirada" width={240} height={240} style={{ display: "block", margin: "16px auto" }} /> : null}
        {expiresAt ? <p><strong>Validade:</strong> {formattedExpiry}</p> : null}
        <div className="cv-form-actions">
          {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Button variant="primary"><Share2 size={15} /> Compartilhar pelo WhatsApp</Button></a> : null}
          <Button type="button" variant="secondary" onClick={generate} disabled={isGenerating}><RefreshCw size={15} /> {isGenerating ? "Gerando..." : code ? "Gerar novo código" : "Gerar código"}</Button>
          <Button type="button" variant="ghost" onClick={onClose}><Check size={15} /> Concluir</Button>
        </div>
      </div>
    </div>
  );
}
