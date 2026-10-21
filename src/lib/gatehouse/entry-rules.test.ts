import { describe, expect, it } from "vitest";
import { canAutoRegisterEntry, passEventCooldownRemaining } from "./entry-rules";

const activePass = {
  status: "found",
  authorizationId: "a1b2c3d4-0000-4000-8000-000000000001",
  operational: { code: "active" },
};

describe("canAutoRegisterEntry", () => {
  it("allows an active pass with an access point", () => {
    expect(canAutoRegisterEntry(activePass, "point-1")).toBe(true);
  });

  it("refuses without an access point", () => {
    expect(canAutoRegisterEntry(activePass, "")).toBe(false);
  });

  it("refuses scheduled and expired passes", () => {
    expect(canAutoRegisterEntry({ ...activePass, operational: { code: "scheduled" } }, "point-1")).toBe(false);
    expect(canAutoRegisterEntry({ ...activePass, operational: { code: "expired" } }, "point-1")).toBe(false);
  });

  it("refuses a pass for a person who is already inside", () => {
    expect(canAutoRegisterEntry({ ...activePass, alreadyInside: true }, "point-1")).toBe(false);
  });

  it("refuses invalid lookups and passes without a located authorization", () => {
    expect(canAutoRegisterEntry({ status: "invalid" }, "point-1")).toBe(false);
    expect(canAutoRegisterEntry({ ...activePass, authorizationId: null }, "point-1")).toBe(false);
  });
});

describe("passEventCooldownRemaining", () => {
  const NOW = new Date("2026-10-21T12:00:00Z");

  it("allows a pass that has no previous event", () => {
    expect(passEventCooldownRemaining(null, NOW)).toBe(0);
  });

  it("blocks an event right after the last one, the accidental double read", () => {
    expect(passEventCooldownRemaining("2026-10-21T11:59:50Z", NOW)).toBe(110);
  });

  it("allows the next event once the cooldown has passed", () => {
    expect(passEventCooldownRemaining("2026-10-21T11:57:00Z", NOW)).toBe(0);
  });
});
