import { describe, expect, it } from "vitest";
import { generateResidentPickupCode, verifyPickupCode } from "./package-pickup";

const SECRET = "x".repeat(48);
const PACKAGE_ID = "5b1f0c2e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const NOW = new Date("2026-10-21T12:00:00Z");

describe("resident package pickup action", () => {
  it("rejects packages that are not received", () => {
    expect(() => generateResidentPickupCode(PACKAGE_ID, "collected", SECRET, NOW)).toThrow(
      "Só é possível gerar código para encomendas recebidas."
    );
  });

  it("reports a missing server secret", () => {
    expect(() => generateResidentPickupCode(PACKAGE_ID, "received", undefined, NOW)).toThrow(
      "PACKAGE_PICKUP_SECRET"
    );
  });

  it("generates a code verified by the pickup-code library", () => {
    const result = generateResidentPickupCode(PACKAGE_ID, "received", SECRET, NOW);
    expect(verifyPickupCode(result.code, SECRET, NOW)).toEqual({ valid: true, packageId: PACKAGE_ID });
    expect(result.expiresAt).toBe("2026-10-28T12:00:00.000Z");
  });
});
