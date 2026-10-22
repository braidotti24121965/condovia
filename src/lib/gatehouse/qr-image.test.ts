import { describe, expect, it } from "vitest";
import { Ecc, QrCode } from "./qrcode";

describe("QR image source", () => {
  it("encodes the pickup code as an SVG the image renderer can read", () => {
    const svg = QrCode.encodeText("cadcf3c7-b263-4770-b1ac-b45677114b6c.1793191757.abc", Ecc.MEDIUM).toSvgString(4);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("viewBox=");
  });
});
