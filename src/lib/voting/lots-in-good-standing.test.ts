import { describe, expect, it } from "vitest";
import { eligibleUnits, parseLotsInGoodStanding } from "./lots-in-good-standing";

describe("parseLotsInGoodStanding", () => {
  it("reads one code per line, ignoring the header and blank lines", () => {
    const result = parseLotsInGoodStanding("lote\nA1\n\nG30\n");
    expect(result).toEqual({ codes: ["A1", "G30"], invalid: [] });
  });

  it("removes duplicates and normalizes case and spaces", () => {
    expect(parseLotsInGoodStanding("a 1\nA1\n a1 ").codes).toEqual(["A1"]);
  });

  it("reports invalid codes instead of accepting them", () => {
    const result = parseLotsInGoodStanding("A1\n@@@\n");
    expect(result.codes).toEqual(["A1"]);
    expect(result.invalid).toEqual(["@@@"]);
  });

  it("reads the first column when the file has more columns", () => {
    expect(parseLotsInGoodStanding("A1;em dia\nA2;em dia").codes).toEqual(["A1", "A2"]);
  });
});

describe("eligibleUnits", () => {
  it("keeps only the units on the list of lots in good standing", () => {
    const units = [{ code: "A1" }, { code: "A2" }, { code: "G30" }];
    expect(eligibleUnits(units, ["A2", "G30"])).toEqual([{ code: "A2" }, { code: "G30" }]);
  });
});
