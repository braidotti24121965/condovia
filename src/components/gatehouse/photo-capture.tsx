"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

interface Props {
  onCapture: (photo: Blob | null) => void;
  disabled?: boolean;
}

/**
 * Photo is taken with the device camera only. There is no file picker, so the
 * photo always comes from the person in front of the registering user.
 */
export function PhotoCapture({ onCapture, disabled = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setCameraError(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
    } finally {
      setStarting(false);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setPreviewUrl(URL.createObjectURL(blob));
        onCapture(blob);
        stopStream();
      },
      "image/jpeg",
      0.9
    );
  };

  const retake = () => {
    setPreviewUrl(null);
    onCapture(null);
    startCamera();
  };

  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // Runs only on unmount; the preview URL is revoked with the last value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gap: "8px", justifyItems: "start" }}>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="Foto capturada" style={{ width: "240px", borderRadius: "12px" }} />
      ) : (
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Visualização da câmera para foto"
          style={{ width: "240px", borderRadius: "12px", background: "var(--cv-brand-navy)" }}
        />
      )}
      {cameraError ? <Alert tone="error">{cameraError}</Alert> : null}
      <div className="cv-form-actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {previewUrl ? (
          <Button type="button" variant="secondary" onClick={retake} disabled={disabled}>
            <RefreshCw size={15} /> Tirar outra foto
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={startCamera} disabled={disabled || starting}>
              <Camera size={15} /> {starting ? "Abrindo câmera..." : "Abrir câmera"}
            </Button>
            <Button type="button" variant="primary" onClick={takePhoto} disabled={disabled || starting}>
              Capturar foto
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
