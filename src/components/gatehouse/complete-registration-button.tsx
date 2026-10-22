"use client";

import { useState } from "react";
import { ClipboardCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/feedback";
import { completeProviderRegistrationAction, completeVisitorRegistrationAction } from "@/lib/gatehouse/actions";
import { formatBrazilianCpf } from "@/lib/condominium/format";
import { PhotoCapture } from "@/components/gatehouse/photo-capture";

interface Props {
  kind: "visitor" | "provider";
  person: { id: string; full_name: string; document_type: string | null; document_number: string | null };
}

/** Completes a registration made before photo and document became mandatory. */
export function CompleteRegistrationButton({ kind, person }: Props) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!photo) return;
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("person_id", person.id);
    fd.set("photo", photo, "foto.jpg");
    const action = kind === "visitor" ? completeVisitorRegistrationAction : completeProviderRegistrationAction;
    const res = await action(null, fd);
    setLoading(false);
    if (res && "error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
    }, 1000);
  };

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <ClipboardCheck size={15} /> Completar cadastro
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`complete-registration-${person.id}`}
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
          <div className="cv-panel" style={{ width: "min(100%, 500px)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
              <h2 id={`complete-registration-${person.id}`}>
                <ClipboardCheck size={18} /> Completar cadastro: {person.full_name}
              </h2>
              <Button variant="icon" type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Fechar">
                <X size={18} />
              </Button>
            </div>

            {error && <div style={{ marginBottom: "16px" }}><Alert tone="error">{error}</Alert></div>}
            {success && <div style={{ marginBottom: "16px" }}><Alert tone="success">Cadastro completo.</Alert></div>}

            <form onSubmit={handleSubmit} className="cv-form">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <label>
                  Tipo doc.
                  <select name="document_type" defaultValue={person.document_type ?? "cpf"}>
                    <option value="cpf">CPF</option>
                    <option value="rg">RG</option>
                    <option value="cnh">CNH</option>
                    <option value="passport">Passaporte</option>
                  </select>
                </label>
                <label>
                  Número do documento *
                  <input
                    name="document_number"
                    inputMode="numeric"
                    required
                    defaultValue={person.document_number ?? ""}
                    placeholder="Ex: 123.456.789-00"
                    onChange={(e) => { e.currentTarget.value = formatBrazilianCpf(e.currentTarget.value); }}
                  />
                </label>
              </div>

              <div className="cv-field-wide" style={{ display: "grid", gap: "8px" }}>
                <span>Foto do visitante *</span>
                <PhotoCapture onCapture={setPhoto} disabled={loading} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label>
                  Placa do veículo
                  <input name="vehicle_plate" placeholder="ABC1D23" maxLength={8} autoComplete="off" />
                </label>
                <label>
                  Modelo e cor
                  <input name="vehicle_model" placeholder="Ex: Onix prata" />
                </label>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" name="is_recurring" />
                Visitante recorrente (o morador define quando marcar)
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <SubmitButton type="submit" disabled={loading || !photo}>
                  {loading ? "Salvando..." : "Salvar cadastro"}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
