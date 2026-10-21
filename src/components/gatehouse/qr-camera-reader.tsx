"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import { decodeQrFrame } from "@/lib/gatehouse/qr-frame";

interface Props {
  onRead: (text: string) => void;
  continuous?: boolean;
  onStatus?: (status: ScanStatus) => void;
  prompt?: string;
  unavailableMessage?: string;
}

export interface ScanStatus {
  frames: number;
  width: number;
  height: number;
  lastRead: string;
}

const SCAN_INTERVAL_MS = 500;

export function shouldReadQrValue(
  previous: { value: string | null; seenAt: number },
  value: string,
  now: number,
  intervalMs = SCAN_INTERVAL_MS,
) {
  const sameCode = value === previous.value;
  const stillInFrame = now - previous.seenAt <= intervalMs * 2;
  return !sameCode || !stillInFrame;
}

/** Camera view that reads one QR Code and reports its text. Decoding runs in JavaScript (jsQR). */
export function QrCameraReader({ onRead, continuous = false, onStatus, prompt, unavailableMessage }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onReadRef = useRef(onRead);
  const onStatusRef = useRef(onStatus);
  const lastCodeRef = useRef<{ value: string | null; seenAt: number }>({ value: null, seenAt: 0 });
  const [status, setStatus] = useState<"starting" | "active" | "unavailable">("starting");

  useEffect(() => {
    onReadRef.current = onRead;
  });

  useEffect(() => {
    onStatusRef.current = onStatus;
  });

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("active");

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        timer = window.setInterval(() => {
          const current = videoRef.current;
          if (!current || current.readyState < 2 || !context) return;
          canvas.width = current.videoWidth;
          canvas.height = current.videoHeight;
          context.drawImage(current, 0, 0, canvas.width, canvas.height);
          const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
          const text = decodeQrFrame(data, canvas.width, canvas.height);
          onStatusRef.current?.({
            frames: 1,
            width: canvas.width,
            height: canvas.height,
            lastRead: text ? "QR lido" : "nenhum QR neste quadro",
          });
          if (text) {
            const now = Date.now();
            if (!continuous || shouldReadQrValue(lastCodeRef.current, text, now)) {
              onReadRef.current(text);
            }
            lastCodeRef.current = { value: text, seenAt: now };
            if (!continuous && timer !== null) window.clearInterval(timer);
          } else if (continuous) {
            lastCodeRef.current = { value: null, seenAt: 0 };
          }
        }, SCAN_INTERVAL_MS);
      } catch (error) {
        console.warn("[qr-camera-reader] câmera indisponível:", error);
        setStatus("unavailable");
      }
    };

    start();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [continuous]);

  if (status === "unavailable") {
    return <Alert tone="warning">{unavailableMessage ?? "A leitura pela câmera não está disponível neste navegador. Digite a observação manualmente."}</Alert>;
  }

  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Visualização da câmera para leitura do QR Code da etiqueta"
        style={{ width: "100%", maxWidth: "420px", borderRadius: "12px", background: "var(--cv-brand-navy)" }}
      />
      <p className="cv-muted" style={{ margin: 0, fontSize: "13px" }}>
        {status === "starting" ? "Iniciando a câmera..." : prompt ?? "Aponte a câmera para o QR Code da etiqueta."}
      </p>
    </div>
  );
}
