import { describe, expect, it } from "vitest";
import { createPickupCode, pickupRejectionMessage, verifyPickupCode } from "./package-pickup";

const SECRET = "x".repeat(48);
const OTHER_SECRET = "y".repeat(48);
const PACKAGE_ID = "5b1f0c2e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const NOW = new Date("2026-10-21T12:00:00Z");

describe("pickup codes", () => {
  it("accepts a fresh code for the same secret", () => {
    const code = createPickupCode(PACKAGE_ID, SECRET, NOW);
    expect(verifyPickupCode(code, SECRET, NOW)).toEqual({ valid: true, packageId: PACKAGE_ID });
  });

  it("refuses a code after the 7 day validity", () => {
    const code = createPickupCode(PACKAGE_ID, SECRET, NOW);
    const eightDaysLater = new Date(NOW.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(verifyPickupCode(code, SECRET, eightDaysLater)).toEqual({ valid: false, reason: "expired" });
  });

  it("refuses a code signed with another secret", () => {
    const code = createPickupCode(PACKAGE_ID, OTHER_SECRET, NOW);
    expect(verifyPickupCode(code, SECRET, NOW)).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("refuses a code whose package ID was changed", () => {
    const code = createPickupCode(PACKAGE_ID, SECRET, NOW);
    const tampered = code.replace(PACKAGE_ID, "6c2a1d3f-2b3c-4d4e-9f00-1b2c3d4e5f60");
    expect(verifyPickupCode(tampered, SECRET, NOW)).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("refuses a code whose expiry was extended", () => {
    const code = createPickupCode(PACKAGE_ID, SECRET, NOW);
    const [id, expires, signature] = code.split(".");
    const extended = `${id}.${Number(expires) + 86400}.${signature}`;
    expect(verifyPickupCode(extended, SECRET, NOW)).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("refuses malformed input", () => {
    expect(verifyPickupCode("", SECRET, NOW)).toEqual({ valid: false, reason: "malformed" });
    expect(verifyPickupCode("abc.def", SECRET, NOW)).toEqual({ valid: false, reason: "malformed" });
    expect(verifyPickupCode(`not-a-uuid.123.sig`, SECRET, NOW)).toEqual({ valid: false, reason: "malformed" });
  });

  it("does not create codes with a short secret or invalid package ID", () => {
    expect(() => createPickupCode(PACKAGE_ID, "curto", NOW)).toThrow();
    expect(() => createPickupCode("nao-e-uuid", SECRET, NOW)).toThrow();
  });
});

describe("pickupRejectionMessage", () => {
  it("explains each refusal in portuguese", () => {
    expect(pickupRejectionMessage("expired")).toContain("já venceu");
    expect(pickupRejectionMessage("bad_signature")).toContain("inválido");
    expect(pickupRejectionMessage("malformed")).toContain("não é um código");
  });
});
