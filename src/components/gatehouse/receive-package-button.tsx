"use client";

import { useState } from "react";
import { PackagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { receivePackageAction } from "@/lib/gatehouse/actions";

interface Props {
  units: { id: string; code: string; display_name: string | null }[];
}

export function ReceivePackageButton({ units }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await receivePackageAction(null, fd);
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
      <Button type="button" onClick={() => setOpen(true)}>
        <PackagePlus size={16} /> Receber Encomenda
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
          <div className="cv-panel" style={{ width: "min(100%, 500px)" }}>
            <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
              <h2><PackagePlus size={18} /> Registrar Recebimento de Encomenda</h2>
              <Button variant="icon"
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X size={18} />
              </Button>
            </div>

            {error && <div style={{ marginBottom: "16px" }}><Alert tone="error">{error}</Alert></div>}
            {success && <div style={{ marginBottom: "16px" }}><Alert tone="success">Encomenda registrada com sucesso!</Alert></div>}

            <form onSubmit={handleSubmit} className="cv-form">
              <label className="cv-field-wide">
                Unidade destinatária *
                <select name="unit_id" required defaultValue="">
                  <option value="" disabled>Selecione a unidade...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>Unidade {u.code} {u.display_name ? `(${u.display_name})` : ""}</option>
                  ))}
                </select>
              </label>

              <label className="cv-field-wide">
                Descrição da encomenda *
                <input name="description" required minLength={2} placeholder="Ex: Caixa média Mercado Livre" />
              </label>

              <label className="cv-field-wide">
                Transportadora / Entregador
                <input name="carrier" placeholder="Ex: Correios, Amazon, Loggi, Motoboy" />
              </label>

              <label className="cv-field-wide">
                Observações de armazenamento
                <input name="notes" placeholder="Ex: Deixado no escaninho 101" />
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Registrando..." : "Confirmar Recebimento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
