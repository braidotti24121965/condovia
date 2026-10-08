import { describe, expect, it } from "vitest";
import { eligibleReservationIds, filterReservations, pruneReservationSelection } from "./reservation-list";

const rows = [
  { id: "1", resourceName: "Salão", reservationMode: "time_slot" as const, unitCode: "G30", requesterName: "Morador", date: "2026-10-08", schedule: "14:00–18:00", status: "pending" as const },
  { id: "2", resourceName: "Academia", reservationMode: "time_slot" as const, unitCode: "G30", requesterName: "Morador", date: "2026-10-09", schedule: "10:00–11:00", status: "approved" as const },
];
const allStatuses = ["pending", "approved", "rejected", "cancelled"].map((status, index) => ({ ...rows[0], id: `status-${index}`, status: status as "pending" | "approved" | "rejected" | "cancelled", reservationMode: index === 0 ? "day" as const : "time_slot" as const, endsAt: index === 1 ? "2026-10-10T18:00:00Z" : undefined }));

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

  it("keeps every persisted status visible with empty filters", () => {
    expect(filterReservations(allStatuses, "", "", "")).toHaveLength(4);
    expect(filterReservations(allStatuses, "pending", "", "")).toHaveLength(1);
    expect(filterReservations(allStatuses, "cancelled", "", "")).toHaveLength(1);
  });
});

describe("reservation bulk selection", () => {
  it("only selects cancellable pending and approved reservations", () => {
    const candidates = allStatuses.map((row) => ({ ...row, canCancel: true }));
    expect(eligibleReservationIds(candidates)).toEqual(["status-0", "status-1"]);
  });

  it("prunes selections when filters hide reservations", () => {
    expect(pruneReservationSelection(["1", "2", "3"], ["2"])).toEqual(["2"]);
  });
});
