"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { collectPackageAction } from "@/lib/gatehouse/actions";

interface Props {
  packageId: string;
  packageDescription: string;
  unitCode: string;
}

export function CollectPackageModal({ packageId, packageDescription, unitCode }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("package_id", packageId);
    const res = await collectPackageAction(null, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1000);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="primary"
        className="button-small"
        onClick={() => setOpen(true)}
      >
        <CheckCircle2 size={14} /> Entregar
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
          <div className="cv-panel" style={{ width: "min(100%, 460px)" }}>
            <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
              <h2><CheckCircle2 size={18} /> Registrar Retirada</h2>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "var(--cv-text-muted)" }}>
              Liberando <strong>{packageDescription}</strong> para a <strong>Unidade {unitCode}</strong>.
            </p>

            {error && <div style={{ marginBottom: "16px" }}><Alert tone="error">{error}</Alert></div>}
            {success && <div style={{ marginBottom: "16px" }}><Alert tone="success">Encomenda baixada com sucesso!</Alert></div>}

            <form onSubmit={handleSubmit} className="cv-form">
              <label className="cv-field-wide">
                Nome de quem retirou (opcional)
                <input name="collector_name" placeholder="Ex: Morador titular ou autorizado" />
              </label>

              <label className="cv-field-wide">
                Documento de quem retirou (opcional)
                <input name="collector_document" placeholder="Ex: CPF ou RG" />
              </label>

              <label className="cv-field-wide">
                Observações (opcional)
                <input name="notes" placeholder="Ex: Retirado pelo cônjuge" />
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Liberando..." : "Confirmar Entrega"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
