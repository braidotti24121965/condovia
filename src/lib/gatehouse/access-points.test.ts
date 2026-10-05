import { describe, expect, it } from "vitest";
import { filterActiveAccessPoints } from "./data";
import type { AccessPoint } from "./types";
import { accessPointTypeLabels } from "./labels";

const points: AccessPoint[] = [
  { id: "a-active", condominium_id: "condo-a", name: "Portaria Principal", type: "mixed", status: "active" },
  { id: "a-inactive", condominium_id: "condo-a", name: "Portaria Antiga", type: "vehicle", status: "inactive" },
  { id: "b-active", condominium_id: "condo-b", name: "Portaria Serviço", type: "service", status: "active" },
];

describe("access point selection", () => {
  it("isolates active points by condominium and preserves inactive history", () => {
    expect(filterActiveAccessPoints(points, "condo-a").map((point) => point.id)).toEqual(["a-active"]);
    expect(filterActiveAccessPoints(points, "condo-b").map((point) => point.id)).toEqual(["b-active"]);
    expect(points.find((point) => point.id === "a-inactive")?.status).toBe("inactive");
    expect(accessPointTypeLabels[points[0].type]).toBe("Misto");
    expect(points[0].type).toBe("mixed");
  });
});
