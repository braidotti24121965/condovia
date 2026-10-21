"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, DoorOpen, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import { ContentSelect } from "@/components/ui/form-controls";
import { checkVisitorPassAction, registerEntryAction, type VisitorPassCheckResult } from "@/lib/gatehouse/actions";

type DetectedCode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedCode[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const SCAN_INTERVAL_MS = 500;

const operationalVariant: Record<string, StatusBadgeVariant> = {
  active: "success",
  scheduled: "info",
  expired: "danger",
};

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector ?? null;
}

interface Props {
  accessPoints: { id: string; name: string }[];
}

export function PassCheckScanner({ accessPoints }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastCodeRef = useRef<string | null>(null);
  const [cameraState, setCameraState] = useState<"starting" | "active" | "unavailable">("starting");
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<VisitorPassCheckResult | { error: string } | null>(null);
  const [isChecking, startChecking] = useTransition();
  const [accessPointId, setAccessPointId] = useState(accessPoints[0]?.id ?? "");
  const [entryMessage, setEntryMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isRegistering, startRegistering] = useTransition();

  const checkPass = (rawValue: string) => {
    startChecking(async () => {
      const response = await checkVisitorPassAction(rawValue);
      setEntryMessage(null);
      setResult(response);
    });
  };

  const handleRegisterEntry = (authorizationId: string) => {
    startRegistering(async () => {
      const formData = new FormData();
      formData.append("authorization_id", authorizationId);
      formData.append("access_point_id", accessPointId);
      const response = await registerEntryAction(null, formData);
      if ("error" in response) {
        setEntryMessage({ tone: "error", text: response.error ?? "Não foi possível registrar a entrada." });
        return;
      }
      setEntryMessage({ tone: "success", text: "Entrada registrada." });
    });
  };

  useEffect(() => {
    const Detector = getBarcodeDetector();
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
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

        const detector = new Detector({ formats: ["qr_code"] });
        timer = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value && value !== lastCodeRef.current) {
              lastCodeRef.current = value;
              checkPass(value);
            }
          } catch {
            // Frame could not be decoded; the next tick tries again.
          }
        }, SCAN_INTERVAL_MS);
      } catch {
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
    lastCodeRef.current = null;
    checkPass(manualInput);
  };

  return (
    <div style={{ display: "grid", gap: "16px" }}>
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
          </>
        )}
      </section>

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
                ) : null}
                <Button
                  type="button"
                  variant="primary"
                  disabled={isRegistering || !accessPointId || entryMessage?.tone === "success"}
                  onClick={() => handleRegisterEntry(result.authorizationId as string)}
                >
                  <DoorOpen size={15} /> {isRegistering ? "Registrando..." : "Registrar entrada"}
                </Button>
              </div>
            ) : (
              <Alert tone="warning">Entrada indisponível: não foi possível localizar a autorização deste passe.</Alert>
            )}
            {entryMessage ? <Alert tone={entryMessage.tone}>{entryMessage.text}</Alert> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
