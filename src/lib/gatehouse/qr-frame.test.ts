import { describe, expect, it } from "vitest";
import { Ecc, QrCode, buildAuthorizationPassUrl } from "./qrcode";
import { decodeQrFrame, renderQrFrame } from "./qr-frame";

describe("decodeQrFrame", () => {
  it("reads back the pass link from a rendered QR frame", () => {
    const passUrl = buildAuthorizationPassUrl("Ab3_dE-fGh1JkLmN0pQrStUvWxYz0123456789abcdE", "https://condovia.test");
    const qr = QrCode.encodeText(passUrl, Ecc.MEDIUM);
    const { pixels, width, height } = renderQrFrame(qr);

    expect(decodeQrFrame(pixels, width, height)).toBe(passUrl);
  });

  it("reads back texts of several sizes, including versions above 1", () => {
    for (const text of ["hello", "x".repeat(10), "x".repeat(17), "x".repeat(30), "x".repeat(70)]) {
      const { pixels, width, height } = renderQrFrame(QrCode.encodeText(text, Ecc.MEDIUM));
      expect(decodeQrFrame(pixels, width, height)).toBe(text);
    }
  });

  it("returns null when the frame has no QR Code", () => {
    const width = 200;
    const height = 200;
    const blank = new Uint8ClampedArray(width * height * 4).fill(255);

    expect(decodeQrFrame(blank, width, height)).toBeNull();
  });
});
