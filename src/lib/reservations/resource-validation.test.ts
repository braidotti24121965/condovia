import { describe, expect, it } from "vitest";
import { formatCurrencyBRL, parseCurrencyBRL, toMinutes, validateResourceHours, validateResourceValues } from "./resource-validation";

describe("reservable resource rules", () => {
  it("validates numeric resource rules", () => {
    expect(validateResourceValues({ name: "Salão", capacity: "0", minimum_advance_minutes: "60", maximum_advance_minutes: "30", minimum_duration_minutes: "120", maximum_duration_minutes: "60", buffer_minutes: "0", cancellation_deadline_minutes: "0", usage_fee: "-1" })).toMatchObject({ capacity: expect.any(String), maximum_advance_minutes: expect.any(String), maximum_duration_minutes: expect.any(String), usage_fee: expect.any(String) });
  });
  it("accepts local recurring hours and rejects inverted or overlapping ranges", () => {
    expect(validateResourceHours([{ weekday: 1, start_time: "08:00", end_time: "12:00", active: true }])).toEqual([]);
    expect(validateResourceHours([{ weekday: 1, start_time: "12:00", end_time: "08:00", active: true }]).length).toBeGreaterThan(0);
    expect(validateResourceHours([{ weekday: 1, start_time: "08:00", end_time: "12:00", active: true }, { weekday: 1, start_time: "10:00", end_time: "14:00", active: true }]).length).toBeGreaterThan(0);
  });

  it("converts friendly duration units to persisted minutes", () => {
    expect(toMinutes("2", "hours")).toBe(120);
    expect(toMinutes("1", "days")).toBe(1440);
    expect(toMinutes("30", "minutes")).toBe(30);
  });

  it("formats and parses Brazilian currency without changing its value", () => {
    expect(formatCurrencyBRL(25.5)).toBe("R$ 25,50");
    expect(parseCurrencyBRL("R$ 25,50")).toBe("25.50");
  });
});
