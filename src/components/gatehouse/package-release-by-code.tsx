"use client";

import { useState, useTransition } from "react";
import { Camera, PackageCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { QrCameraReader } from "@/components/gatehouse/qr-camera-reader";
import { checkPackagePickupCodeAction, releasePackageByCodeAction } from "@/lib/gatehouse/actions";

type CheckedPackage = { packageId: string; description: string; unitCode: string };

/** Releases a package with the resident's pickup code: read or paste it, check it, then confirm. */
export function PackageReleaseByCode() {
  const [codeInput, setCodeInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [checked, setChecked] = useState<CheckedPackage | null>(null);
  const [checkedCode, setCheckedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isWorking, startWorking] = useTransition();

  const check = (rawCode: string) => {
    startWorking(async () => {
      const result = await checkPackagePickupCodeAction(rawCode);
      if ("error" in result) {
        setChecked(null);
        setCheckedCode(null);
        setMessage({ tone: "error", text: result.error ?? "Não foi possível conferir o código." });
        return;
      }
      setMessage(null);
      setChecked({ packageId: result.packageId, description: result.description, unitCode: result.unitCode });
      setCheckedCode(rawCode);
    });
  };

  const release = () => {
    if (!checkedCode) return;
    startWorking(async () => {
      const result = await releasePackageByCodeAction(checkedCode);
      if ("error" in result) {
        setMessage({ tone: "error", text: result.error ?? "Não foi possível liberar a encomenda." });
        return;
      }
      setChecked(null);
      setCheckedCode(null);
      setCodeInput("");
      setMessage({ tone: "success", text: "Encomenda liberada e retirada registrada." });
    });
  };

  return (
    <section className="cv-panel" aria-labelledby="release-by-code-title" style={{ display: "grid", gap: "16px" }}>
      <h2 id="release-by-code-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <PackageCheck size={18} /> Liberar encomenda com código do morador
      </h2>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Button type="button" variant="secondary" onClick={() => setScanning((value) => !value)}>
          <Camera size={15} /> {scanning ? "Fechar leitura" : "Ler QR do morador"}
        </Button>
      </div>
      {scanning ? (
        <QrCameraReader
          onRead={(text) => {
            setScanning(false);
            setCodeInput(text);
            check(text);
          }}
        />
      ) : null}

      <form
        className="cv-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (codeInput.trim()) check(codeInput);
        }}
      >
        <label className="cv-field-wide">
          <span>Ou cole o código de retirada</span>
          <input value={codeInput} onChange={(event) => setCodeInput(event.target.value)} autoComplete="off" />
        </label>
        <Button type="submit" variant="secondary" disabled={isWorking || !codeInput.trim()}>
          <Search size={15} /> {isWorking ? "Conferindo..." : "Conferir código"}
        </Button>
      </form>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {checked ? (
        <div className="cv-panel" style={{ display: "grid", gap: "12px" }}>
          <p style={{ margin: 0 }}>
            <strong>{checked.description}</strong> · Unidade {checked.unitCode}
          </p>
          <p className="cv-muted" style={{ margin: 0, fontSize: "13px" }}>
            Confira com quem está retirando antes de confirmar.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Button type="button" variant="ghost" onClick={() => setChecked(null)} disabled={isWorking}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={release} disabled={isWorking}>
              {isWorking ? "Liberando..." : "Confirmar retirada"}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
