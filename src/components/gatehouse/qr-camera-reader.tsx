"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/feedback";
import { decodeQrFrame } from "@/lib/gatehouse/qr-frame";

interface Props {
  onRead: (text: string) => void;
}

const SCAN_INTERVAL_MS = 500;

/** Camera view that reads one QR Code and reports its text. Decoding runs in JavaScript (jsQR). */
export function QrCameraReader({ onRead }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onReadRef = useRef(onRead);
  const [status, setStatus] = useState<"starting" | "active" | "unavailable">("starting");

  useEffect(() => {
    onReadRef.current = onRead;
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
          if (text) {
            if (timer !== null) window.clearInterval(timer);
            onReadRef.current(text);
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
  }, []);

  if (status === "unavailable") {
    return <Alert tone="warning">A leitura pela câmera não está disponível neste navegador. Digite a observação manualmente.</Alert>;
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
        {status === "starting" ? "Iniciando a câmera..." : "Aponte a câmera para o QR Code da etiqueta."}
      </p>
    </div>
  );
}
