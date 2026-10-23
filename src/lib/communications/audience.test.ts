import { describe, expect, it } from "vitest";
import { reachesUnit, validateCommunication } from "./audience";

describe("validateCommunication", () => {
  it("accepts a title and body within the limits", () => {
    expect(validateCommunication({ title: "Manutenção do elevador", body: "Sábado, das 8h às 12h.", structureId: null })).toBeNull();
  });

  it("rejects a title that is too short after trimming", () => {
    expect(validateCommunication({ title: "  ab  ", body: "Texto válido", structureId: null })).toBe("title");
  });

  it("rejects an empty body", () => {
    expect(validateCommunication({ title: "Aviso", body: "   ", structureId: null })).toBe("body");
  });
});

describe("reachesUnit", () => {
  it("reaches every unit when the communication has no structure", () => {
    expect(reachesUnit(null, "structure-a")).toBe(true);
  });

  it("reaches only the units of the target structure", () => {
    expect(reachesUnit("structure-a", "structure-a")).toBe(true);
    expect(reachesUnit("structure-a", "structure-b")).toBe(false);
  });
});
