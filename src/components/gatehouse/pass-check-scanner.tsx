"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, DoorOpen, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import { ContentSelect } from "@/components/ui/form-controls";
import { checkVisitorPassAction, registerEntryAction, type VisitorPassCheckResult } from "@/lib/gatehouse/actions";
import { decodeQrFrame } from "@/lib/gatehouse/qr-frame";
import { canAutoRegisterEntry } from "@/lib/gatehouse/entry-rules";

const SCAN_INTERVAL_MS = 500;

const operationalVariant: Record<string, StatusBadgeVariant> = {
  active: "success",
  scheduled: "info",
  expired: "danger",
};

/**
 * Returns a function that reads the QR Code in the current video frame.
 * The frame is decoded in JavaScript (jsQR) rather than with the browser's
 * BarcodeDetector, which reads phone screens unreliably and is missing in
 * some browsers. jsQR gives the same result in every browser.
 */
function createFrameDetector(): (video: HTMLVideoElement) => Promise<string | null> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    if (!context) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    return decodeQrFrame(data, canvas.width, canvas.height);
  };
}

interface Props {
  accessPoints: { id: string; name: string }[];
}

export function PassCheckScanner({ accessPoints }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Last code seen by the camera and when. A code is checked when it first appears or when it
  // leaves the frame and comes back, so holding it still does not repeat the check.
  const lastCodeRef = useRef<{ value: string | null; seenAt: number }>({ value: null, seenAt: 0 });
  const [cameraState, setCameraState] = useState<"starting" | "active" | "unavailable">("starting");
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<VisitorPassCheckResult | { error: string } | null>(null);
  const [isChecking, startChecking] = useTransition();
  const [accessPointId, setAccessPointId] = useState(accessPoints[0]?.id ?? "");
  // The camera loop reads this ref, so it always sees the selected access point.
  const accessPointIdRef = useRef(accessPointId);
  useEffect(() => {
    accessPointIdRef.current = accessPointId;
  }, [accessPointId]);
  const [entryMessage, setEntryMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isRegistering, startRegistering] = useTransition();
  const [scanStatus, setScanStatus] = useState({ frames: 0, width: 0, height: 0, lastRead: "nenhuma leitura ainda" });

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

  // autoRegister is set only for camera reads, so the operator always confirms
  // typed or pasted links through the explicit button.
  const checkPass = (rawValue: string, autoRegister: boolean) => {
    startChecking(async () => {
      const response = await checkVisitorPassAction(rawValue);
      setEntryMessage(null);
      setResult(response);
      if (autoRegister && "status" in response && canAutoRegisterEntry(response, accessPointIdRef.current)) {
        const authorizationId = "authorizationId" in response ? response.authorizationId : null;
        if (authorizationId) {
          setEntryMessage(await registerEntry(authorizationId, accessPointIdRef.current));
        }
      }
    });
  };

  // The camera loop calls the latest checkPass through this ref.
  const checkPassRef = useRef(checkPass);
  useEffect(() => {
    checkPassRef.current = checkPass;
  });

  const handleRegisterEntry = (authorizationId: string) => {
    startRegistering(async () => {
      setEntryMessage(await registerEntry(authorizationId, accessPointId));
    });
  };

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("unavailable");
      return;
    }

    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setCameraState("active");

        const detectCode = createFrameDetector();
        timer = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const { videoWidth, videoHeight } = videoRef.current;
            const value = await detectCode(videoRef.current);
            setScanStatus((previous) => ({
              frames: previous.frames + 1,
              width: videoWidth,
              height: videoHeight,
              lastRead: value ? "QR lido" : "nenhum QR neste quadro",
            }));
            const now = Date.now();
            if (value) {
              const isSameCode = value === lastCodeRef.current.value;
              const stillInFrame = now - lastCodeRef.current.seenAt <= SCAN_INTERVAL_MS * 2;
              if (!isSameCode || !stillInFrame) checkPassRef.current(value, true);
              lastCodeRef.current = { value, seenAt: now };
            }
          } catch (error) {
            // Frame could not be decoded; the next tick tries again. Logged so a
            // failing reader shows up in the browser console instead of silently.
            console.warn("[pass-check] leitura da câmera falhou:", error);
          }
        }, SCAN_INTERVAL_MS);
      } catch (error) {
        console.warn("[pass-check] câmera indisponível:", error);
        setCameraState("unavailable");
      }
    };

    start();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualInput.trim()) return;
    lastCodeRef.current = { value: null, seenAt: 0 };
    checkPass(manualInput, false);
  };

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {/* Camera and pasted link sit side by side; the result follows right below them. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", alignItems: "start" }}>
      <section className="cv-panel" aria-labelledby="pass-camera-title">
        <h2 id="pass-camera-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Camera size={18} /> Leitura pela câmera
        </h2>
        {cameraState === "unavailable" ? (
          <Alert tone="warning">
            A leitura pela câmera não está disponível neste navegador. Cole o link do passe abaixo.
          </Alert>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="Visualização da câmera para leitura do QR Code"
              style={{ width: "100%", maxWidth: "420px", borderRadius: "12px", background: "var(--cv-brand-navy)" }}
            />
            <p className="cv-muted" style={{ margin: "8px 0 0 0", fontSize: "13px" }}>
              {cameraState === "starting" ? "Iniciando a câmera..." : "Aponte a câmera para o QR Code do passe."}
            </p>
            {cameraState === "active" ? (
              <p className="cv-muted" style={{ margin: "4px 0 0 0", fontSize: "12px" }}>
                Quadros analisados: {scanStatus.frames} · resolução: {scanStatus.width}×{scanStatus.height} · {scanStatus.lastRead}
              </p>
            ) : null}
          </>
        )}
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
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isRegistering || !accessPointId || result.alreadyInside || entryMessage?.tone === "success"}
                    onClick={() => handleRegisterEntry(result.authorizationId as string)}
                  >
                    <DoorOpen size={15} />{" "}
                    {entryMessage?.tone === "success"
                      ? "Entrada registrada"
                      : result.alreadyInside
                      ? "Já está dentro"
                      : isRegistering
                      ? "Registrando..."
                      : "Registrar entrada"}
                  </Button>
                  {result.alreadyInside && entryMessage?.tone !== "success" ? (
                    <Alert tone="info">Esta pessoa já consta dentro do condomínio. Registre a saída em Presença para liberar uma nova entrada.</Alert>
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
