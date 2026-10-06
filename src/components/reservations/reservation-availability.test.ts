import { describe, expect, it } from "vitest";
import { filterReservationsForResource } from "./reservation-availability";

const reservations = [
  { resource_id: "hall", starts_at: "2026-10-08T14:00:00Z", ends_at: "2026-10-08T15:00:00Z", own: false },
  { resource_id: "court", starts_at: "2026-10-08T14:00:00Z", ends_at: "2026-10-08T15:00:00Z", own: true },
];

describe("reservation availability resource isolation", () => {
  it("shows only reservations for the selected resource", () => {
    expect(filterReservationsForResource(reservations, "hall")).toHaveLength(1);
    expect(filterReservationsForResource(reservations, "hall")[0].resource_id).toBe("hall");
    expect(filterReservationsForResource(reservations, "court")[0].own).toBe(true);
  });

  it("does not retain the previous resource reservations after switching", () => {
    const nextResourceReservations = filterReservationsForResource(reservations, "court");
    expect(nextResourceReservations.some((reservation) => reservation.resource_id === "hall")).toBe(false);
  });
});
