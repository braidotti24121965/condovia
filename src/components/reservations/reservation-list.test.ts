import { describe, expect, it } from "vitest";
import { filterReservations } from "./reservation-list";

const rows = [
  { id: "1", resourceName: "Salão", unitCode: "G30", requesterName: "Morador", date: "2026-10-08", schedule: "14:00–18:00", status: "pending" as const },
  { id: "2", resourceName: "Academia", unitCode: "G30", requesterName: "Morador", date: "2026-10-09", schedule: "10:00–11:00", status: "approved" as const },
];

describe("reservation list filters", () => {
  it("filters by status, resource, date and combinations", () => {
    expect(filterReservations(rows, "pending", "", "")).toHaveLength(1);
    expect(filterReservations(rows, "", "Academia", "")).toHaveLength(1);
    expect(filterReservations(rows, "", "", "2026-10-08")).toHaveLength(1);
    expect(filterReservations(rows, "pending", "Salão", "2026-10-08")[0].id).toBe("1");
  });
});
