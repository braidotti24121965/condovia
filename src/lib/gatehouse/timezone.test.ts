import { describe, expect, it } from "vitest";
import {
  formatAuthorizationWindowInTimezone,
  formatDateTimeInTimezone,
  formatTimeInTimezone,
  getAuthorizationOperationalStatus,
  getDayBoundsInTimezone,
  isAuthorizationValidAt,
  parseDateTimeInTimezone,
  toLocalDateTimeInput,
} from "./timezone";

describe("Gatehouse timezone handling", () => {
  it("formats the expected-arrival window in the condominium timezone", () => {
    expect(
      formatAuthorizationWindowInTimezone(
        "2026-10-05T19:00:00.000Z",
        "2026-10-05T21:00:00.000Z",
        "America/Sao_Paulo"
      )
    ).toBe("16:00 até 18:00");
  });

  it("formats entry time in the condominium timezone", () => {
    expect(formatTimeInTimezone("2026-10-05T19:20:00Z", "America/Sao_Paulo")).toBe("16:20");
  });

  it("converts America/Sao_Paulo local inputs to exact UTC moments and formats them back", () => {
    const tz = "America/Sao_Paulo";
    const fromStr = "2026-10-05T14:53";
    const untilStr = "2026-10-05T17:00";

    const fromUtc = parseDateTimeInTimezone(fromStr, tz);
    const untilUtc = parseDateTimeInTimezone(untilStr, tz);

    // America/Sao_Paulo is UTC-3 (sem horário de verão em 2026):
    // 14:53 BRT -> 17:53 UTC
    // 17:00 BRT -> 20:00 UTC
    expect(fromUtc.toISOString()).toBe("2026-10-05T17:53:00.000Z");
    expect(untilUtc.toISOString()).toBe("2026-10-05T20:00:00.000Z");

    // Round-trip formatting must match 14:53 and 17:00 exactly
    expect(formatDateTimeInTimezone(fromUtc, tz)).toBe("05/10/2026, 14:53");
    expect(formatDateTimeInTimezone(untilUtc, tz)).toBe("05/10/2026, 17:00");
  });

  it("calculates ACTIVE status when the clock is between valid_from and valid_until", () => {
    const tz = "America/Sao_Paulo";
    const fromUtc = parseDateTimeInTimezone("2026-10-05T14:53", tz);
    const untilUtc = parseDateTimeInTimezone("2026-10-05T17:00", tz);

    const clockDuring = parseDateTimeInTimezone("2026-10-05T15:30", tz);
    const status = getAuthorizationOperationalStatus(fromUtc, untilUtc, clockDuring);

    expect(status.code).toBe("active");
    expect(status.label).toBe("Ativa");
    expect(status.tone).toBe("active");
  });

  it("calculates SCHEDULED status when clock is before valid_from", () => {
    const tz = "America/Sao_Paulo";
    const fromUtc = parseDateTimeInTimezone("2026-10-05T14:53", tz);
    const untilUtc = parseDateTimeInTimezone("2026-10-05T17:00", tz);

    const clockBefore = parseDateTimeInTimezone("2026-10-05T14:52", tz);
    const status = getAuthorizationOperationalStatus(fromUtc, untilUtc, clockBefore);

    expect(status.code).toBe("scheduled");
    expect(status.label).toBe("Agendada");
    expect(status.tone).toBe("info");
  });

  it("calculates EXPIRED status only after valid_until", () => {
    const tz = "America/Sao_Paulo";
    const fromUtc = parseDateTimeInTimezone("2026-10-05T14:53", tz);
    const untilUtc = parseDateTimeInTimezone("2026-10-05T17:00", tz);

    const clockExactlyEnd = parseDateTimeInTimezone("2026-10-05T17:00", tz);
    const statusAtEnd = getAuthorizationOperationalStatus(fromUtc, untilUtc, clockExactlyEnd);
    expect(statusAtEnd.code).toBe("active");

    const clockAfter = parseDateTimeInTimezone("2026-10-05T17:01", tz);
    const statusAfter = getAuthorizationOperationalStatus(fromUtc, untilUtc, clockAfter);
    expect(statusAfter.code).toBe("expired");
    expect(statusAfter.label).toBe("Expirada");
    expect(statusAfter.tone).toBe("inactive");
  });

  it("filters entry authorizations at fixed instants using inclusive UTC comparisons", () => {
    const from = "2026-10-05T19:00:00.000Z";
    const until = "2026-10-05T21:00:00.000Z";

    expect(isAuthorizationValidAt(from, until, "2026-10-05T18:59:00.000Z")).toBe(false);
    expect(isAuthorizationValidAt(from, until, "2026-10-05T19:02:00.000Z")).toBe(true);
    expect(isAuthorizationValidAt(from, until, "2026-10-05T21:01:00.000Z")).toBe(false);
    expect(isAuthorizationValidAt("2026-10-05T16:00:00.000Z", "2026-10-05T17:00:00.000Z", "2026-10-05T19:02:00.000Z")).toBe(false);
  });

  it("works accurately with other non-Brasília timezones without fixed offsets", () => {
    // New York (UTC-5 standard / UTC-4 daylight saving)
    const nyWinter = parseDateTimeInTimezone("2026-01-15T09:30", "America/New_York");
    expect(nyWinter.toISOString()).toBe("2026-01-15T14:30:00.000Z");
    expect(formatDateTimeInTimezone(nyWinter, "America/New_York")).toBe("15/01/2026, 09:30");

    const nySummer = parseDateTimeInTimezone("2026-07-15T09:30", "America/New_York");
    expect(nySummer.toISOString()).toBe("2026-07-15T13:30:00.000Z");
    expect(formatDateTimeInTimezone(nySummer, "America/New_York")).toBe("15/07/2026, 09:30");

    // Tokyo (UTC+9)
    const tokyo = parseDateTimeInTimezone("2026-06-20T22:15", "Asia/Tokyo");
    expect(tokyo.toISOString()).toBe("2026-06-20T13:15:00.000Z");
    expect(formatDateTimeInTimezone(tokyo, "Asia/Tokyo")).toBe("20/06/2026, 22:15");

    // London (UTC+0 standard / UTC+1 BST)
    const londonSummer = parseDateTimeInTimezone("2026-07-01T15:00", "Europe/London");
    expect(londonSummer.toISOString()).toBe("2026-07-01T14:00:00.000Z");
    expect(formatDateTimeInTimezone(londonSummer, "Europe/London")).toBe("01/07/2026, 15:00");
  });

  it("produces correct datetime-local input values for form defaults", () => {
    const fixedDate = new Date("2026-10-05T17:53:00.000Z");
    const spValue = toLocalDateTimeInput(fixedDate, "America/Sao_Paulo");
    expect(spValue).toBe("2026-10-05T14:53");

    const tokyoValue = toLocalDateTimeInput(fixedDate, "Asia/Tokyo");
    expect(tokyoValue).toBe("2026-10-06T02:53");
  });

  it("calculates day bounds in condominium timezone", () => {
    const fixedNow = new Date("2026-10-05T15:00:00.000Z"); // 12:00 BRT
    const bounds = getDayBoundsInTimezone("America/Sao_Paulo", fixedNow);

    expect(bounds.startOfDayUtc).toBe("2026-10-05T03:00:00.000Z");
    expect(bounds.endOfDayUtc).toBe("2026-10-06T02:59:59.999Z");
  });
});
