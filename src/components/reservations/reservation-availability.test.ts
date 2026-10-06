import { describe, expect, it } from "vitest";
import { filterReservationsForResource, getTimeSlotStepMinutes, isSlotWithinAdvanceWindow } from "./reservation-availability";

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

describe("time slot advance window", () => {
  const now = new Date("2026-10-06T11:00:00Z");
  it("allows a slot inside a one-hour to eight-hour window", () => {
    expect(isSlotWithinAdvanceWindow(new Date("2026-10-06T12:00:00Z"), new Date("2026-10-06T13:00:00Z"), 60, 480, now)).toBe(true);
  });
  it("rejects a day completely beyond the maximum advance", () => {
    expect(isSlotWithinAdvanceWindow(new Date("2026-10-07T12:00:00Z"), new Date("2026-10-07T13:00:00Z"), 60, 480, now)).toBe(false);
  });
  it("rejects a slot whose end exceeds the maximum window", () => {
    expect(isSlotWithinAdvanceWindow(new Date("2026-10-06T18:30:00Z"), new Date("2026-10-06T19:30:00Z"), 60, 480, now)).toBe(false);
  });
  it("accepts an open maximum window", () => {
    expect(isSlotWithinAdvanceWindow(new Date("2026-10-07T12:00:00Z"), new Date("2026-10-07T13:00:00Z"), 60, null, now)).toBe(true);
  });
});

describe("time slot duration", () => {
  it("uses the resource minimum duration as the slot step", () => {
    expect(getTimeSlotStepMinutes(60)).toBe(60);
    expect(getTimeSlotStepMinutes(30)).toBe(30);
  });
});
