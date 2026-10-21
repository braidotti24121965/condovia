import QRCodeLib from "qrcode";

/**
 * QR Code helpers for visitor passes. Encoding is delegated to the `qrcode`
 * library (MIT), which produces standard ISO/IEC 18004 codes that phones and
 * camera readers decode. The QrCode surface below is kept for existing callers.
 */

export enum Ecc {
  LOW = 0,
  MEDIUM = 1,
  QUARTILE = 2,
  HIGH = 3,
}

const ERROR_CORRECTION_LEVEL = ["L", "M", "Q", "H"] as const;

// The qrcode library indexes modules as get(row, col), i.e. get(y, x).
type QrModules = { size: number; get: (row: number, col: number) => number };

export class QrCode {
  public readonly size: number;

  private constructor(private readonly modules: QrModules) {
    this.size = modules.size;
  }

  public static encodeText(text: string, ecc: Ecc = Ecc.MEDIUM): QrCode {
    const { modules } = QRCodeLib.create(text, { errorCorrectionLevel: ERROR_CORRECTION_LEVEL[ecc] });
    return new QrCode(modules);
  }

  public getModule(x: number, y: number): boolean {
    return this.modules.get(y, x) === 1;
  }

  public toSvgString(border: number = 4): string {
    const side = this.size + border * 2;
    let path = "";
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.getModule(x, y)) {
          path += `M${x + border},${y + border}h1v1h-1z`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${side} ${side}" stroke="none"><rect width="100%" height="100%" fill="#FFFFFF"/><path d="${path}" fill="#000000"/></svg>`;
  }

  public toDataUrl(): string {
    return `data:image/svg+xml;utf8,${encodeURIComponent(this.toSvgString(4))}`;
  }
}

/**
 * Builds the standard visitor access payload and visitor pass URL.
 */
export function buildAuthorizationPassUrl(passToken: string, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "https://condovia.kynovia.com.br");
  return `${base}/pass/${passToken}`;
}

export function buildWhatsAppShareUrl(options: {
  visitorName: string;
  condoName: string;
  unitCode: string;
  validFrom: string;
  validUntil: string;
  passUrl: string;
}): string {
  const text = [
    `*Autorização de Acesso - CondoVia*`,
    `Olá, *${options.visitorName}*!`,
    `Você possui uma liberação de acesso para a *Unidade ${options.unitCode}* no *${options.condoName}*.`,
    ``,
    `📅 *Período de Validade:*`,
    `De: ${options.validFrom}`,
    `Até: ${options.validUntil}`,
    ``,
    `📲 Apresente o QR Code na portaria:`,
    options.passUrl,
  ].join("\n");

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
