import { describe, expect, it } from "vitest";
import { applyProxies, votingUnitsByPerson } from "./voters";

describe("votingUnitsByPerson", () => {
  it("gives one vote per unit owned", () => {
    const voters = votingUnitsByPerson([
      { personId: "ana", unitId: "A1", percentage: 100 },
      { personId: "ana", unitId: "A2", percentage: 100 },
      { personId: "bia", unitId: "A3", percentage: 100 },
    ]);
    expect(voters.find((v) => v.personId === "ana")?.votes).toBe(2);
    expect(voters.find((v) => v.personId === "bia")?.votes).toBe(1);
  });

  it("gives the unit's vote to the co-owner with the largest share", () => {
    const voters = votingUnitsByPerson([
      { personId: "ana", unitId: "A1", percentage: 60 },
      { personId: "bruno", unitId: "A1", percentage: 40 },
    ]);
    expect(voters).toEqual([{ personId: "ana", votes: 1, unitIds: ["A1"] }]);
  });

  it("leaves a unit out when co-owners tie, since a representative must be chosen in writing", () => {
    const voters = votingUnitsByPerson([
      { personId: "ana", unitId: "A1", percentage: 50 },
      { personId: "bruno", unitId: "A1", percentage: 50 },
    ]);
    expect(voters).toEqual([]);
  });
});

describe("applyProxies", () => {
  const voters = [
    { personId: "ana", votes: 2, unitIds: ["A1", "A2"] },
    { personId: "bia", votes: 1, unitIds: ["A3"] },
  ];

  it("transfers the associate's votes to the proxy", () => {
    const result = applyProxies(voters, [{ associateId: "bia", proxyId: "ana" }]);
    expect(result.find((v) => v.personId === "ana")).toMatchObject({ votes: 3 });
    expect(result.find((v) => v.personId === "bia")).toBeUndefined();
  });

  it("ignores a proxy that represents more than one associate", () => {
    const more = [...voters, { personId: "caio", votes: 1, unitIds: ["A4"] }];
    const result = applyProxies(more, [
      { associateId: "bia", proxyId: "ana" },
      { associateId: "caio", proxyId: "ana" },
    ]);
    expect(result.find((v) => v.personId === "ana")).toMatchObject({ votes: 2 });
    expect(result.find((v) => v.personId === "bia")).toMatchObject({ votes: 1 });
  });
});
