import { describe, expect, it } from "vitest";
import { filterReservations } from "./reservation-list";

const rows = [
  { id: "1", resourceName: "Salão", reservationMode: "time_slot" as const, unitCode: "G30", requesterName: "Morador", date: "2026-10-08", schedule: "14:00–18:00", status: "pending" as const },
  { id: "2", resourceName: "Academia", reservationMode: "time_slot" as const, unitCode: "G30", requesterName: "Morador", date: "2026-10-09", schedule: "10:00–11:00", status: "approved" as const },
];

describe("reservation list filters", () => {
  it("shows all dates when the date filter is empty and restores them when cleared", () => {
    expect(filterReservations(rows, "", "", "")).toHaveLength(2);
    expect(filterReservations(rows, "", "", "2026-10-08")).toHaveLength(1);
    expect(filterReservations(rows, "", "", "")).toHaveLength(2);
  });

  it("filters by status, resource, date and combinations", () => {
    expect(filterReservations(rows, "pending", "", "")).toHaveLength(1);
    expect(filterReservations(rows, "", "Academia", "")).toHaveLength(1);
    expect(filterReservations(rows, "", "", "2026-10-08")).toHaveLength(1);
    expect(filterReservations(rows, "pending", "Salão", "2026-10-08")[0].id).toBe("1");
  });
});
