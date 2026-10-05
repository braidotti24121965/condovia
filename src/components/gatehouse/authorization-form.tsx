"use client";

import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { createAuthorizationAction } from "@/lib/gatehouse/actions";
import { formatBrazilianCpf, formatBrazilianPhone } from "@/lib/condominium/format";
import { toLocalDateTimeInput } from "@/lib/gatehouse/timezone";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { Visitor, ServiceProvider } from "@/lib/gatehouse/types";

interface Props {
  units: { id: string; code: string; display_name: string | null }[];
  visitors: Visitor[];
  providers: ServiceProvider[];
  residentMode?: boolean;
  timeZone?: string;
}

export function AuthorizationForm({ units, visitors, providers, residentMode = false, timeZone = "America/Sao_Paulo" }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<"visitor" | "provider">("visitor");
  const [visitorMode, setVisitorMode] = useState<"new" | "recent">("new");
  const [overlap, setOverlap] = useState<{ valid_from: string; valid_until: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await createAuthorizationAction(null, fd);
    setLoading(false);
    if (res?.overlap) {
      setOverlap(res.overlap);
    } else if (res?.error) {
      setError(res.error);
    } else {
      setSuccess("Autorização concedida com sucesso!");
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1200);
    }
  };

  const defaultFrom = toLocalDateTimeInput(new Date(), timeZone);
  const defaultUntil = toLocalDateTimeInput(new Date(Date.now() + 8 * 60 * 60 * 1000), timeZone);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <KeyRound size={16} /> Nova Autorização
      </Button>

      {open && (
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
          <div className="cv-panel" style={{ width: "min(100%, 540px)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
              <h2><KeyRound size={18} /> Conceder Autorização de Acesso</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {error && <div style={{ marginBottom: "16px" }}><Alert tone="error">{error}</Alert></div>}
            {success && <div style={{ marginBottom: "16px" }}><Alert tone="success">{success}</Alert></div>}

            <form onSubmit={handleSubmit} className="cv-form">
              <input type="hidden" name="allow_overlap" defaultValue="" />
              <label className="cv-field-wide">
                Unidade de destino *
                <select name="unit_id" required defaultValue="">
                  <option value="" disabled>Selecione a unidade...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>Unidade {u.code} {u.display_name ? `(${u.display_name})` : ""}</option>
                  ))}
                </select>
              </label>

              {!residentMode && <label className="cv-field-wide">
                Tipo de pessoa
                <select
                  name="target_type"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as "visitor" | "provider")}
                >
                  <option value="visitor">Visitante</option>
                  <option value="provider">Prestador de Serviço</option>
                </select>
              </label>}

              {residentMode ? (
                <>
                  <label className="cv-field-wide">
                    Visitante
                    <select name="visitor_mode" value={visitorMode} onChange={(e) => setVisitorMode(e.target.value as "new" | "recent")}>
                      <option value="new">Novo visitante</option>
                      <option value="recent">Visitantes recentes</option>
                    </select>
                  </label>
                  {visitorMode === "new" ? (
                    <div className="cv-form-grid">
                      <label className="cv-field-wide">Nome *<input name="visitor_name" required /></label>
                      <label>Tipo de documento<select name="document_type" defaultValue=""><option value="">Não informado</option><option value="cpf">CPF</option><option value="rg">RG</option><option value="cnh">CNH</option><option value="passport">Passaporte</option><option value="other">Outro</option></select></label>
                      <label>Documento<input name="document_number" inputMode="numeric" onChange={(e) => { e.currentTarget.value = formatBrazilianCpf(e.currentTarget.value); }} /></label>
                      <label>Telefone<input name="phone" inputMode="tel" onChange={(e) => { e.currentTarget.value = formatBrazilianPhone(e.currentTarget.value); }} /></label>
                    </div>
                  ) : visitors.length ? (
                    <label className="cv-field-wide">Visitante recente *<select name="target_id" required defaultValue=""><option value="" disabled>Selecione...</option>{visitors.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}</select></label>
                  ) : (
                    <Alert tone="info">Nenhum visitante recente. Cadastre um novo visitante para continuar.</Alert>
                  )}
                </>
              ) : targetType === "visitor" ? (
                <label className="cv-field-wide">
                  Visitante *
                  <select name="target_id" required defaultValue="">
                    <option value="" disabled>Selecione o visitante cadastrado...</option>
                    {visitors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.full_name} {v.document_number ? `(${v.document_number})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="cv-field-wide">
                  Prestador de serviço *
                  <select name="target_id" required defaultValue="">
                    <option value="" disabled>Selecione o prestador cadastrado...</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}{p.company_name ? ` · ${p.company_name}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Início da validade *
                  <input type="datetime-local" name="valid_from" required defaultValue={defaultFrom} />
                </label>
                <label>
                  Fim da validade *
                  <input type="datetime-local" name="valid_until" required defaultValue={defaultUntil} />
                </label>
              </div>

              <label className="cv-field-wide">
                Observações (opcional)
                <input name="notes" placeholder="Ex: Liberado acesso à área de lazer" />
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : "Conceder Autorização"}
                </Button>
              </div>
            </form>
            <ConfirmationDialog open={Boolean(overlap)} title="Autorização sobreposta" description={overlap ? `Já existe uma autorização para esta pessoa nesta unidade durante parte deste período: ${formatDateTimeInTimezone(overlap.valid_from, timeZone)} até ${formatDateTimeInTimezone(overlap.valid_until, timeZone)}.` : ""} confirmLabel="Continuar mesmo assim" onCancel={() => setOverlap(null)} onConfirm={() => { setOverlap(null); const form = document.querySelector(".cv-form") as HTMLFormElement | null; if (form) { (form.elements.namedItem("allow_overlap") as HTMLInputElement).value = "true"; form.requestSubmit(); } }} />
          </div>
        </div>
      )}
    </>
  );
}
