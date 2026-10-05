"use client";

import { useState } from "react";
import { Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { createProviderAction } from "@/lib/gatehouse/actions";
import { formatBrazilianCpf, formatBrazilianPhone } from "@/lib/condominium/format";

export function ProviderForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await createProviderAction(null, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess("Prestador de serviço cadastrado com sucesso!");
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 1200);
    }
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Briefcase size={16} /> Novo Prestador
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
          <div className="cv-panel" style={{ width: "min(100%, 520px)" }}>
            <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
              <h2><Briefcase size={18} /> Cadastrar Prestador de Serviço</h2>
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
              <label className="cv-field-wide">
                Nome do profissional *
                <input name="full_name" required minLength={2} placeholder="Ex: Carlos Eletricista" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Empresa / Razão Social
                  <input name="company_name" placeholder="Ex: Reformas Rápidas Ltda" />
                </label>
                <label>
                  Especialidade / Serviço
                  <input name="service_type" placeholder="Ex: Pintura, Hidráulica, Ar condicionado" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <label>
                  Tipo doc.
                  <select name="document_type" defaultValue="cpf">
                    <option value="cpf">CPF</option>
                    <option value="rg">RG</option>
                    <option value="cnh">CNH</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label>
                  Número do documento
                  <input name="document_number" inputMode="numeric" placeholder="Ex: 123.456.789-00" onChange={(e) => { e.currentTarget.value = formatBrazilianCpf(e.currentTarget.value); }} />
                </label>
              </div>

              <label className="cv-field-wide">
                Telefone / Contato
                <input name="phone" inputMode="tel" placeholder="Ex: (11) 91234-5678" onChange={(e) => { e.currentTarget.value = formatBrazilianPhone(e.currentTarget.value); }} />
              </label>

              <label className="cv-field-wide">
                Observações
                <input name="notes" placeholder="Ex: Autorizado para obras civis até 17h" />
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Cadastrando..." : "Salvar Prestador"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
