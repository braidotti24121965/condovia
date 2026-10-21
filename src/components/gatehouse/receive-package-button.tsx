"use client";

import { useState } from "react";
import { Camera, PackagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/feedback";
import { receivePackageAction } from "@/lib/gatehouse/actions";
import { buildPackageLabelNote, packageCarrierOptions } from "@/lib/gatehouse/package-label";
import { QrCameraReader } from "@/components/gatehouse/qr-camera-reader";

interface Props {
  units: { id: string; code: string; display_name: string | null }[];
}

export function ReceivePackageButton({ units }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [labelRead, setLabelRead] = useState(false);

  // Set when the label was already received. The porteiro can confirm to receive it again.
  const [duplicate, setDuplicate] = useState(false);
  const [lastFormData, setLastFormData] = useState<FormData | null>(null);

  const submitForm = async (fd: FormData) => {
    setLoading(true);
    setError(null);
    setDuplicate(false);
    setLastFormData(fd);
    const res = await receivePackageAction(null, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      setDuplicate(Boolean(res.duplicate));
    } else {
      setSuccess(true);
      setNotes("");
      setLabelRead(false);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1000);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submitForm(new FormData(e.currentTarget));
  };

  const receiveAnyway = () => {
    if (!lastFormData) return;
    const fd = new FormData();
    lastFormData.forEach((value, key) => fd.append(key, value));
    fd.set("confirm_duplicate", "true");
    void submitForm(fd);
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

            {error && <div style={{ marginBottom: "16px" }}><Alert tone={duplicate ? "warning" : "error"}>{error}</Alert></div>}
            {duplicate ? (
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "16px" }}>
                <Button type="button" variant="secondary" onClick={() => setDuplicate(false)}>Cancelar</Button>
                <Button type="button" variant="primary" onClick={receiveAnyway} disabled={loading}>Receber mesmo assim</Button>
              </div>
            ) : null}
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
                <input name="description" placeholder="Opcional. Ex: Caixa média Mercado Livre" />
              </label>

              <label className="cv-field-wide">
                Transportadora / Entregador
                <select name="carrier" defaultValue="">
                  <option value="">Não informada</option>
                  {packageCarrierOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <div className="cv-field-wide" style={{ display: "grid", gap: "8px" }}>
                <Button type="button" variant="secondary" onClick={() => setScanning((value) => !value)}>
                  <Camera size={15} /> {scanning ? "Fechar leitura" : "Ler QR da etiqueta"}
                </Button>
                {scanning && (
                  <QrCameraReader
                    onRead={(text) => {
                      setNotes(buildPackageLabelNote(text));
                      setLabelRead(true);
                      setScanning(false);
                    }}
                  />
                )}
                {labelRead && (
                  <Alert tone="success">QR lido. Confira as observações e confirme o recebimento.</Alert>
                )}
              </div>

              <label className="cv-field-wide">
                Observações de armazenamento
                <input
                  name="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Ex: Deixado no escaninho 101"
                />
              </label>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <SubmitButton type="submit" disabled={loading}>
                  {loading ? "Registrando..." : "Confirmar Recebimento"}
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
