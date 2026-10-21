import { describe, expect, it } from "vitest";
import { canAutoRegisterEntry } from "./entry-rules";

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

  it("refuses invalid lookups and passes without a located authorization", () => {
    expect(canAutoRegisterEntry({ status: "invalid" }, "point-1")).toBe(false);
    expect(canAutoRegisterEntry({ ...activePass, authorizationId: null }, "point-1")).toBe(false);
  });
});
