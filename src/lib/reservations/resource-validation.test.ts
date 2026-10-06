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

  it.each([
    ["1", "days", "8", "hours", true],
    ["8", "hours", "1", "days", false],
    ["60", "minutes", "1", "hours", false],
    ["2", "hours", "90", "minutes", true],
    ["1", "days", "1", "days", false],
  ])("compares normalized advance units: %s %s / %s %s", (minimum, minimumUnit, maximum, maximumUnit, invalid) => {
    const errors = validateResourceValues({ name: "Quadra", capacity: "1", minimum_advance_minutes: String(toMinutes(minimum, minimumUnit as "minutes" | "hours" | "days")), maximum_advance_minutes: String(toMinutes(maximum, maximumUnit as "minutes" | "hours" | "days")), minimum_duration_minutes: "30", maximum_duration_minutes: "", buffer_minutes: "0", cancellation_deadline_minutes: "0", usage_fee: "" });
    expect(Boolean(errors.maximum_advance_minutes)).toBe(invalid);
  });

  it("uses the requested messages for inverted advance and duration rules", () => {
    const errors = validateResourceValues({ name: "Quadra", capacity: "1", minimum_advance_minutes: "1440", maximum_advance_minutes: "480", minimum_duration_minutes: "120", maximum_duration_minutes: "90", buffer_minutes: "0", cancellation_deadline_minutes: "0", usage_fee: "" });
    expect(errors.maximum_advance_minutes).toBe("A antecedência mínima não pode ser maior que a antecedência máxima.");
    expect(errors.maximum_duration_minutes).toBe("A duração mínima não pode ser maior que a duração máxima.");
  });

  it("formats and parses Brazilian currency without changing its value", () => {
    expect(formatCurrencyBRL(25.5)).toBe("R$ 25,50");
    expect(parseCurrencyBRL("R$ 25,50")).toBe("25.50");
  });
});
