import { describe, it, expect } from "vitest";
import {
  QrCode,
  Ecc,
  buildAuthorizationPassUrl,
  buildWhatsAppShareUrl,
} from "./qrcode";

describe("QRCode Generator", () => {
  it("encodes URL and generates valid SVG", () => {
    const url = "https://condovia.kynovia.com.br/pass/fa458100-0000-4000-8000-000000000001";
    const qr = QrCode.encodeText(url, Ecc.MEDIUM);
    expect(qr.size).toBeGreaterThan(20);
    const svg = qr.toSvgString(4);
    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox=");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<path");
  });

  it("generates data URL", () => {
    const qr = QrCode.encodeText("CONDOVIA-TEST-123", Ecc.LOW);
    const dataUrl = qr.toDataUrl();
    expect(dataUrl.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  });

  it("builds correct visitor pass URL", () => {
    const passUrl = buildAuthorizationPassUrl(
      "fa458100-0000-4000-8000-000000000001",
      "https://homolog-condovia.kynovia.com.br"
    );
    expect(passUrl).toBe(
      "https://homolog-condovia.kynovia.com.br/pass/fa458100-0000-4000-8000-000000000001"
    );
  });

  it("builds WhatsApp share URL with encoded message", () => {
    const waUrl = buildWhatsAppShareUrl({
      visitorName: "João Silva",
      condoName: "Condomínio Reserva",
      unitCode: "101",
      validFrom: "20/10/2026 14:00",
      validUntil: "20/10/2026 18:00",
      passUrl: "https://condovia.kynovia.com.br/pass/fa458100-0000",
    });
    expect(waUrl.startsWith("https://api.whatsapp.com/send?text=")).toBe(true);
    expect(waUrl).toContain(encodeURIComponent("João Silva"));
    expect(waUrl).toContain(encodeURIComponent("Unidade 101"));
  });
});
