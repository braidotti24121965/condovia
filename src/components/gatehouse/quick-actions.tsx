"use client";

import { useState } from "react";
import { LogIn, LogOut, FileQuestion, PackagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { formatAuthorizationWindowInTimezone } from "@/lib/gatehouse/timezone";
import {
  registerEntryAction,
  registerExitAction,
  createAccessRequestAction,
  receivePackageAction,
} from "@/lib/gatehouse/actions";
import type { AccessAuthorization, AccessPoint, GatehousePresence, Visitor, ServiceProvider } from "@/lib/gatehouse/types";

interface Props {
  authorizations: AccessAuthorization[];
  accessPoints: AccessPoint[];
  presenceList: GatehousePresence[];
  units: { id: string; code: string; display_name: string | null }[];
  visitors: Visitor[];
  providers: ServiceProvider[];
  timeZone: string;
}

export function QuickActions({
  authorizations,
  accessPoints,
  presenceList,
  units,
  visitors,
  providers,
  timeZone,
}: Props) {
  const [activeModal, setActiveModal] = useState<"entry" | "exit" | "request" | "package" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setActiveModal(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleEntrySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await registerEntryAction(null, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess("Entrada registrada com sucesso!");
      setTimeout(reset, 1200);
    }
  };

  const handleExitSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await registerExitAction(null, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess("Saída registrada com sucesso!");
      setTimeout(reset, 1200);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await createAccessRequestAction(null, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess("Solicitação de acesso enviada ao morador!");
      setTimeout(reset, 1200);
    }
  };

  const handlePackageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await receivePackageAction(null, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess("Encomenda registrada com sucesso!");
      setTimeout(reset, 1200);
    }
  };

  return (
    <>
      <div className="cv-quick-actions-bar">
        <button
          type="button"
          onClick={() => { setError(null); setSuccess(null); setActiveModal("entry"); }}
          className="cv-action-card"
        >
          <span className="cv-action-card-icon cv-badge-entry">
            <LogIn size={20} />
          </span>
          <div>
            <strong>Registrar entrada</strong>
            <small className="cv-muted" style={{ display: "block" }}>Autorizações ativas</small>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setError(null); setSuccess(null); setActiveModal("exit"); }}
          className="cv-action-card"
        >
          <span className="cv-action-card-icon cv-badge-exit">
            <LogOut size={20} />
          </span>
          <div>
            <strong>Registrar saída</strong>
            <small className="cv-muted" style={{ display: "block" }}>Pessoas dentro agora</small>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setError(null); setSuccess(null); setActiveModal("request"); }}
          className="cv-action-card"
        >
          <span className="cv-action-card-icon cv-badge-request">
            <FileQuestion size={20} />
          </span>
          <div>
            <strong>Solicitar autorização</strong>
            <small className="cv-muted" style={{ display: "block" }}>Envio ao morador</small>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setError(null); setSuccess(null); setActiveModal("package"); }}
          className="cv-action-card"
        >
          <span className="cv-action-card-icon cv-badge-package">
            <PackagePlus size={20} />
          </span>
          <div>
            <strong>Receber encomenda</strong>
            <small className="cv-muted" style={{ display: "block" }}>Nova entrega na portaria</small>
          </div>
        </button>
      </div>

      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
            padding: "16px",
          }}
        >
          <div
            className="cv-panel"
            style={{ width: "min(100%, 540px)", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
              <h2>
                {activeModal === "entry" && <><LogIn size={20} /> Registrar Entrada</>}
                {activeModal === "exit" && <><LogOut size={20} /> Registrar Saída</>}
                {activeModal === "request" && <><FileQuestion size={20} /> Solicitar Autorização</>}
                {activeModal === "package" && <><PackagePlus size={20} /> Receber Encomenda</>}
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={reset}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {error && <div style={{ marginBottom: "16px" }}><Alert tone="error">{error}</Alert></div>}
            {success && <div style={{ marginBottom: "16px" }}><Alert tone="success">{success}</Alert></div>}

            {activeModal === "entry" && (
              <form onSubmit={handleEntrySubmit} className="cv-form">
                <label className="cv-field-wide">
                  Autorização válida
                  <select name="authorization_id" required defaultValue="" className="cv-field-auto">
                    <option value="" disabled>Selecione quem está autorizado...</option>
                    {authorizations.map((a) => {
                      const name = a.visitor?.full_name || a.service_provider?.full_name || "Sem nome";
                      const company = a.service_provider?.company_name ? ` (${a.service_provider.company_name})` : "";
                      const unit = a.unit ? ` · Unidade ${a.unit.code}` : "";
                      const window = ` · ${formatAuthorizationWindowInTimezone(a.valid_from, a.valid_until, timeZone).replace(" até ", "–")}`;
                      return (
                        <option key={a.id} value={a.id}>
                          {name}{company}{unit}{window}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="cv-field-wide">
                  Ponto de acesso
                  <select name="access_point_id" required defaultValue={accessPoints[0]?.id || ""}>
                    {accessPoints.map((ap) => (
                      <option key={ap.id} value={ap.id}>{ap.name} ({ap.type})</option>
                    ))}
                  </select>
                </label>

                <label className="cv-field-wide">
                  Observações (opcional)
                  <input name="notes" placeholder="Ex: Placa do veículo, crachá de visitante" />
                </label>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Registrando..." : "Confirmar Entrada"}
                  </Button>
                </div>
              </form>
            )}

            {activeModal === "exit" && (
              <form onSubmit={handleExitSubmit} className="cv-form">
                <label className="cv-field-wide">
                  Pessoa dentro agora
                  <select
                    name="target_type_and_id"
                    required
                    defaultValue=""
                    onChange={(e) => {
                      const [kind, id] = e.target.value.split(":");
                      const form = e.target.form;
                      if (form) {
                        (form.elements.namedItem("target_type") as HTMLInputElement).value = kind || "";
                        (form.elements.namedItem("target_id") as HTMLInputElement).value = id || "";
                      }
                    }}
                  >
                    <option value="" disabled>Selecione quem está saindo...</option>
                    {presenceList.map((p) => (
                      <option key={p.target_id} value={`${p.target_kind}:${p.target_id}`}>
                        {p.full_name} · Unidade {p.unit_code}
                      </option>
                    ))}
                  </select>
                  <input type="hidden" name="target_type" />
                  <input type="hidden" name="target_id" />
                </label>

                <label className="cv-field-wide">
                  Ponto de saída
                  <select name="access_point_id" required defaultValue={accessPoints[0]?.id || ""}>
                    {accessPoints.map((ap) => (
                      <option key={ap.id} value={ap.id}>{ap.name} ({ap.type})</option>
                    ))}
                  </select>
                </label>

                <label className="cv-field-wide">
                  Observações (opcional)
                  <input name="notes" placeholder="Ex: Devolução de crachá" />
                </label>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Registrando..." : "Confirmar Saída"}
                  </Button>
                </div>
              </form>
            )}

            {activeModal === "request" && (
              <form onSubmit={handleRequestSubmit} className="cv-form">
                <label className="cv-field-wide">
                  Unidade de destino
                  <select name="unit_id" required defaultValue="">
                    <option value="" disabled>Selecione a unidade...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>Unidade {u.code} {u.display_name ? `(${u.display_name})` : ""}</option>
                    ))}
                  </select>
                </label>

                <label className="cv-field-wide">
                  Tipo de visitante
                  <select
                    name="target_type"
                    defaultValue="visitor"
                    onChange={(e) => {
                      const val = e.target.value;
                      const visitorSelect = document.getElementById("req-visitor-select");
                      const providerSelect = document.getElementById("req-provider-select");
                      if (visitorSelect && providerSelect) {
                        visitorSelect.style.display = val === "visitor" ? "block" : "none";
                        providerSelect.style.display = val === "provider" ? "block" : "none";
                      }
                    }}
                  >
                    <option value="visitor">Visitante</option>
                    <option value="provider">Prestador de Serviço</option>
                  </select>
                </label>

                <div id="req-visitor-select" className="cv-field-wide">
                  <label>
                    Visitante
                    <select name="target_id" defaultValue="">
                      <option value="" disabled>Selecione o visitante...</option>
                      {visitors.map((v) => (
                        <option key={v.id} value={v.id}>{v.full_name} {v.document_number ? `(${v.document_number})` : ""}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div id="req-provider-select" className="cv-field-wide" style={{ display: "none" }}>
                  <label>
                    Prestador de serviço
                    <select name="target_id_provider" defaultValue="" onChange={(e) => {
                      const hiddenTarget = document.querySelector('input[name="target_id_actual"]') as HTMLInputElement;
                      if (hiddenTarget) hiddenTarget.value = e.target.value;
                    }}>
                      <option value="" disabled>Selecione o prestador...</option>
                      {providers.map((sp) => (
                        <option key={sp.id} value={sp.id}>{sp.full_name} {sp.company_name ? `(${sp.company_name})` : ""}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="cv-field-wide">
                  Mensagem / Justificativa para o morador
                  <input name="notes" placeholder="Ex: Entrega de orçamento, visita de parente" />
                </label>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Solicitação"}
                  </Button>
                </div>
              </form>
            )}

            {activeModal === "package" && (
              <form onSubmit={handlePackageSubmit} className="cv-form">
                <label className="cv-field-wide">
                  Unidade destinatária
                  <select name="unit_id" required defaultValue="">
                    <option value="" disabled>Selecione a unidade...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>Unidade {u.code}</option>
                    ))}
                  </select>
                </label>

                <label className="cv-field-wide">
                  Descrição da encomenda
                  <input name="description" required placeholder="Ex: Caixa média Mercado Livre, Envelope azul" />
                </label>

                <label className="cv-field-wide">
                  Transportadora / Entregador (opcional)
                  <input name="carrier" placeholder="Ex: Correios, Sedex, Amazon, Loggi" />
                </label>

                <label className="cv-field-wide">
                  Observações (opcional)
                  <input name="notes" placeholder="Ex: Deixado na gaveta 4, frágil" />
                </label>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Recebendo..." : "Confirmar Recebimento"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
