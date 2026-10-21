import { describe, expect, it } from "vitest";
import { shouldReadQrValue } from "./qr-camera-reader";

describe("shouldReadQrValue", () => {
  it("reads the first appearance", () => {
    expect(shouldReadQrValue({ value: null, seenAt: 0 }, "pass", 1000)).toBe(true);
  });

  it("does not read the same QR while it remains in frame", () => {
    expect(shouldReadQrValue({ value: "pass", seenAt: 1000 }, "pass", 1250)).toBe(false);
  });

  it("reads again after the QR leaves and returns", () => {
    expect(shouldReadQrValue({ value: null, seenAt: 0 }, "pass", 2000)).toBe(true);
  });

  it("reads a different QR immediately", () => {
    expect(shouldReadQrValue({ value: "old-pass", seenAt: 1000 }, "new-pass", 1100)).toBe(true);
  });
});
