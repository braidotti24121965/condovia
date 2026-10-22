"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, DoorOpen, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import { ContentSelect } from "@/components/ui/form-controls";
import { QrCameraReader, type ScanStatus } from "@/components/gatehouse/qr-camera-reader";
import { checkVisitorPassAction, registerEntryAction, registerPassExitAction, type VisitorPassCheckResult } from "@/lib/gatehouse/actions";

const operationalVariant: Record<string, StatusBadgeVariant> = {
  active: "success",
  scheduled: "info",
  expired: "danger",
};

interface Props {
  accessPoints: { id: string; name: string; type: string }[];
}

export function PassCheckScanner({ accessPoints }: Props) {
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<VisitorPassCheckResult | { error: string } | null>(null);
  const [isChecking, startChecking] = useTransition();
  const [accessPointId, setAccessPointId] = useState(accessPoints[0]?.id ?? "");
  // The operator must confirm, looking at the photo, that the person in front of them is the pass holder.
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  // The camera loop reads this ref, so it always sees the selected access point.
  const accessPointIdRef = useRef(accessPointId);
  const selectedPointType = accessPoints.find((point) => point.id === accessPointId)?.type ?? "";
  useEffect(() => {
    accessPointIdRef.current = accessPointId;
  }, [accessPointId]);
  const [entryMessage, setEntryMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isRegistering, startRegistering] = useTransition();
  const [scanStatus, setScanStatus] = useState<ScanStatus>({ frames: 0, width: 0, height: 0, lastRead: "nenhuma leitura ainda" });

  const registerEntry = async (authorizationId: string, pointId: string) => {
    const formData = new FormData();
    formData.append("authorization_id", authorizationId);
    formData.append("access_point_id", pointId);
    const response = await registerEntryAction(null, formData);
    if ("error" in response) {
      return { tone: "error" as const, text: response.error ?? "Não foi possível registrar a entrada." };
    }
    return { tone: "success" as const, text: "Entrada registrada." };
  };

  const registerExit = async (authorizationId: string, pointId: string) => {
    const formData = new FormData();
    formData.append("authorization_id", authorizationId);
    formData.append("access_point_id", pointId);
    const response = await registerPassExitAction(null, formData);
    if ("error" in response) {
      return { tone: "error" as const, text: response.error ?? "Não foi possível registrar a saída." };
    }
    return { tone: "success" as const, text: "Saída registrada." };
  };

  // Every read, camera or typed, only shows the registration. The operator
  // compares the photo and document on screen and confirms with a button.
  const checkPass = (rawValue: string) => {
    startChecking(async () => {
      const response = await checkVisitorPassAction(rawValue);
      setEntryMessage(null);
      setIdentityConfirmed(false);
      setResult(response);
    });
  };

  const handleRegisterEntry = (authorizationId: string) => {
    startRegistering(async () => {
      setEntryMessage(await registerEntry(authorizationId, accessPointId));
    });
  };

  const handleRegisterExit = (authorizationId: string) => {
    startRegistering(async () => {
      setEntryMessage(await registerExit(authorizationId, accessPointId));
    });
  };

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualInput.trim()) return;
    checkPass(manualInput);
  };

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {/* Camera and pasted link sit side by side; the result follows right below them. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", alignItems: "start" }}>
      <section className="cv-panel" aria-labelledby="pass-camera-title">
        <h2 id="pass-camera-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Camera size={18} /> Leitura pela câmera
        </h2>
        <QrCameraReader
          continuous
          onRead={(value) => checkPass(value)}
          onStatus={(status) => setScanStatus((previous) => ({ ...status, frames: previous.frames + 1 }))}
          prompt="Aponte a câmera para o QR Code do passe."
          unavailableMessage="A leitura pela câmera não está disponível neste navegador. Cole o link do passe abaixo."
        />
        {scanStatus.width > 0 ? <p className="cv-muted" style={{ margin: "4px 0 0 0", fontSize: "12px" }}>Quadros analisados: {scanStatus.frames} · resolução: {scanStatus.width}×{scanStatus.height} · {scanStatus.lastRead}</p> : null}
      </section>

        <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
        <section className="cv-panel" aria-labelledby="pass-manual-title">
          <h2 id="pass-manual-title">Colar link do passe</h2>
          <form onSubmit={handleManualSubmit} className="cv-form">
            <label className="cv-field-wide">
              <span>Link ou código do passe</span>
              <input
                name="pass"
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="https://.../pass/..."
                autoComplete="off"
              />
            </label>
            <Button type="submit" variant="secondary" disabled={isChecking || !manualInput.trim()}>
              <Search size={15} /> {isChecking ? "Consultando..." : "Consultar passe"}
            </Button>
          </form>
        </section>
        <section aria-live="polite" aria-label="Resultado da consulta">
          {result && "error" in result ? <Alert tone="error">{result.error}</Alert> : null}
          {result && "status" in result && result.status === "invalid" ? (
            <Alert tone="warning">
              <TriangleAlert size={15} /> {result.message}
            </Alert>
          ) : null}
          {result && "status" in result && result.status === "found" ? (
            <div className="cv-panel" style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} /> {result.visitorName}
                </strong>
                <StatusBadge variant={operationalVariant[result.operational.code] ?? "neutral"}>
                  {result.operational.label}
                </StatusBadge>
              </div>
              <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: 0, fontSize: "14px" }}>
                <dt className="cv-muted">Tipo</dt>
                <dd style={{ margin: 0 }}>{result.visitorType}</dd>
                <dt className="cv-muted">Unidade</dt>
                <dd style={{ margin: 0 }}>Unidade {result.unitCode}</dd>
                <dt className="cv-muted">Condomínio</dt>
                <dd style={{ margin: 0 }}>{result.condominiumName}</dd>
                <dt className="cv-muted">Válido de</dt>
                <dd style={{ margin: 0 }}>{result.validFrom}</dd>
                <dt className="cv-muted">Válido até</dt>
                <dd style={{ margin: 0 }}>{result.validUntil}</dd>
              </dl>

              {result.identity ? (
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "16px", alignItems: "start" }}>
                  {result.identity.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.identity.photoUrl}
                      alt={`Foto de ${result.identity.personName}`}
                      style={{ width: "140px", height: "140px", objectFit: "cover", borderRadius: "12px" }}
                    />
                  ) : (
                    <Alert tone="warning">Sem foto cadastrada.</Alert>
                  )}
                  <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 12px", margin: 0, fontSize: "14px" }}>
                    <dt className="cv-muted">Documento</dt>
                    <dd style={{ margin: 0 }}>{result.identity.documentType.toUpperCase()} {result.identity.documentMasked}</dd>
                    <dt className="cv-muted">Placa</dt>
                    <dd style={{ margin: 0 }}>{result.identity.plates.length ? result.identity.plates.join(", ") : "Nenhuma cadastrada"}</dd>
                  </dl>
                </div>
              ) : (
                <Alert tone="error">Identidade indisponível para o seu perfil. A entrada não pode ser registrada.</Alert>
              )}

              {result.authorizationId ? (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
                  {accessPoints.length > 0 ? (
                    <label>
                      <span>Ponto de acesso</span>
                      <ContentSelect
                        value={accessPointId}
                        onChange={(event) => setAccessPointId(event.target.value)}
                        disabled={isRegistering}
                      >
                        {accessPoints.map((point) => (
                          <option key={point.id} value={point.id}>
                            {point.name}
                          </option>
                        ))}
                      </ContentSelect>
                    </label>
                  ) : (
                    <Alert tone="warning">
                      Nenhum ponto de acesso ativo. Ative ou cadastre um em Pontos de acesso para registrar entradas.
                    </Alert>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                    <input
                      type="checkbox"
                      checked={identityConfirmed}
                      onChange={(event) => setIdentityConfirmed(event.target.checked)}
                      disabled={!result.identity || isRegistering}
                    />
                    Confirmo que a pessoa confere com a foto e o documento
                  </label>
                  {selectedPointType === "vehicle" && result.identity && result.identity.plates.length === 0 ? (
                    <Alert tone="warning">Sem placa cadastrada: entrada de veículo bloqueada neste ponto.</Alert>
                  ) : null}
                  <Button
                    type="button"
                    variant="primary"
                    disabled={
                      isRegistering ||
                      !accessPointId ||
                      !identityConfirmed ||
                      !result.identity ||
                      (selectedPointType === "vehicle" && result.identity.plates.length === 0 && !result.alreadyInside) ||
                      entryMessage?.tone === "success"
                    }
                    onClick={() => result.alreadyInside ? handleRegisterExit(result.authorizationId as string) : handleRegisterEntry(result.authorizationId as string)}
                  >
                    <DoorOpen size={15} />{" "}
                    {entryMessage?.tone === "success"
                      ? result.alreadyInside ? "Saída registrada" : "Entrada registrada"
                      : result.alreadyInside
                      ? isRegistering ? "Registrando..." : "Registrar saída"
                      : isRegistering
                      ? "Registrando..."
                      : "Registrar entrada"}
                  </Button>
                  {result.alreadyInside && entryMessage?.tone !== "success" ? (
                    <Alert tone="info">Esta pessoa já consta dentro do condomínio. A saída pode ser registrada mesmo se o passe estiver vencido.</Alert>
                  ) : null}
                </div>
              ) : (
                <Alert tone="warning">Entrada indisponível: não foi possível localizar a autorização deste passe.</Alert>
              )}
              {entryMessage?.tone === "error" ? <Alert tone="error">{entryMessage.text}</Alert> : null}
            </div>
          ) : null}
        </section>
        </div>
      </div>
    </div>
  );
}
