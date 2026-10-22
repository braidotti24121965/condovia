"use client";

import { useState, useTransition } from "react";
import { QrCode as QrIcon, X, Check, Copy, Download, Share2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateVisitorPassTokenAction } from "@/lib/gatehouse/actions";
import { QrCode, Ecc, buildAuthorizationPassUrl } from "@/lib/gatehouse/qrcode";
import { qrPngBlob } from "@/lib/gatehouse/qr-image";
import { formatDateTimeInTimezone } from "@/lib/gatehouse/timezone";

export interface AuthorizationQrData {
  id: string;
  visitorName: string;
  unitCode: string;
  condoName?: string;
  validFrom: string;
  validUntil: string;
  timeZone?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  authorization: AuthorizationQrData | null;
}

export function AuthorizationQrModal({ open, onClose, authorization }: Props) {
  const [copied, setCopied] = useState(false);
  const [passToken, setPassToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  if (!open || !authorization) return null;

  const timeZone = authorization.timeZone || "America/Sao_Paulo";
  const condoName = authorization.condoName || "Condomínio";
  const formattedFrom = formatDateTimeInTimezone(authorization.validFrom, timeZone);
  const formattedUntil = formatDateTimeInTimezone(authorization.validUntil, timeZone);

  // The raw token exists only in this component's memory; it is never stored in the database.
  const passUrl = passToken ? buildAuthorizationPassUrl(passToken) : null;
  const svgString = passUrl ? QrCode.encodeText(passUrl, Ecc.MEDIUM).toSvgString(4) : null;
  const svgDataUrl = svgString ? `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}` : null;

  const shareText = `Autorização de acesso - CondoVia\nVisitante: ${authorization.visitorName}\nUnidade: ${authorization.unitCode}\nCondomínio: ${condoName}\nVálido de ${formattedFrom} até ${formattedUntil}`;

  // Sends the QR as a PNG when the browser can attach files. Otherwise saves the image and opens WhatsApp with the text.
  const shareQr = async () => {
    if (!passUrl) return;
    const blob = await qrPngBlob(passUrl);
    const file = new File([blob], "qrcode-acesso.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Autorização de acesso", text: shareText });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qrcode-acesso.png";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n\nA imagem do QR foi baixada: anexe-a nesta conversa.`)}`, "_blank", "noopener,noreferrer");
  };

  const handleGenerate = () => {
    startGenerating(async () => {
      const result = await generateVisitorPassTokenAction(authorization.id);
      if ("error" in result) {
        setTokenError(result.error ?? "Não foi possível gerar o QR Code.");
        return;
      }
      setTokenError(null);
      setCopied(false);
      setPassToken(result.token);
    });
  };

  const handleCopyMessage = async () => {
    if (!passUrl) return;
    const text = [
      `*Autorização de Acesso - CondoVia*`,
      `Olá, *${authorization.visitorName}*!`,
      `Você possui uma liberação de acesso para a *Unidade ${authorization.unitCode}* no *${condoName}*.`,
      ``,
      `📅 *Período de Validade:*`,
      `De: ${formattedFrom}`,
      `Até: ${formattedUntil}`,
      ``,
      `📲 Apresente o QR Code na portaria:`,
      passUrl,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadPng = () => {
    if (!svgDataUrl) return;
    const img = new Image();
    img.src = svgDataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `qrcode-autorizacao-${authorization.visitorName.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.click();
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.5)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: "16px",
      }}
    >
      <div
        className="cv-panel"
        style={{
          width: "min(100%, 460px)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="cv-panel-heading" style={{ marginBottom: "16px" }}>
          <h2 id="qr-modal-title">
            <QrIcon size={20} /> QR Code de Acesso
          </h2>
          <Button
            variant="icon"
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} />
          </Button>
        </div>

        <p className="cv-muted" style={{ margin: "0 0 16px 0", fontSize: "14px" }}>
          {passUrl
            ? "Envie este QR Code ao visitante. Ele poderá apresentar na portaria para liberação imediata."
            : "Gere o QR Code para compartilhar com o visitante. Gerar um novo QR invalida o anterior."}
        </p>

        {tokenError ? (
          <p role="alert" className="cv-field-error" style={{ margin: "0 0 16px 0", fontSize: "14px" }}>
            {tokenError}
          </p>
        ) : null}

        {/* QR Code Container */}
        {svgString ? (
          <div
            style={{
              background: "#ffffff",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid var(--cv-border, #e2e8f0)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto 16px auto",
              width: "240px",
              height: "240px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            }}
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        ) : null}

        {/* Detalhes do Acesso */}
        <div
          style={{
            background: "var(--cv-panel-bg, #f8fafc)",
            border: "1px solid var(--cv-border, #e2e8f0)",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "20px",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span className="cv-muted">Visitante / Prestador:</span>
            <strong>{authorization.visitorName}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span className="cv-muted">Unidade de Destino:</span>
            <strong>Unidade {authorization.unitCode}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span className="cv-muted">Início:</span>
            <span>{formattedFrom}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="cv-muted">Validade até:</span>
            <span>{formattedUntil}</span>
          </div>
        </div>

        {/* Ações */}
        <div
          className="cv-form-actions"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          {passUrl ? (
            <>
              <Button type="button" variant="primary" onClick={() => void shareQr()}>
                <Share2 size={15} /> Compartilhar QR
              </Button>

              <Button type="button" variant="secondary" onClick={handleCopyMessage}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copiado!" : "Copiar Dados"}
              </Button>

              <Button type="button" variant="outline" onClick={handleDownloadPng}>
                <Download size={15} /> Baixar PNG
              </Button>

              <a
                href={passUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Button type="button" variant="ghost">
                  <ExternalLink size={15} /> Ver Passe
                </Button>
              </a>
            </>
          ) : null}

          <Button
            type="button"
            variant={passUrl ? "outline" : "primary"}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <RefreshCw size={15} />
            {isGenerating ? "Gerando..." : passUrl ? "Gerar novo QR" : "Gerar QR Code"}
          </Button>

          <Button type="button" variant="secondary" onClick={onClose}>
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}
