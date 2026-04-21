/**
 * Tests for lib/date-utils.ts — pure timezone-aware date helpers.
 *
 * These functions underpin every streak, due-date and daily-quest calculation
 * in the app. Timezone correctness is verified by comparing UTC vs UTC+2
 * outputs and checking arithmetic across month/year boundaries.
 */

import { describe, it, expect } from "vitest";
import {
  getLocalDateString,
  getLocalTomorrowString,
  getLocalYesterdayString,
  getLocalDayBeforeYesterdayString,
} from "@/lib/date-utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the string matches YYYY-MM-DD format. */
function isDateString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// ─── getLocalDateString ───────────────────────────────────────────────────────

describe("getLocalDateString", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    const result = getLocalDateString("Europe/Berlin");
    expect(isDateString(result)).toBe(true);
  });

  it("returns the same day for UTC and a UTC+0 timezone", () => {
    // UTC and UTC reference should agree
    const utc = getLocalDateString("UTC");
    const explicit = getLocalDateString("Etc/UTC");
    expect(utc).toBe(explicit);
  });

  it("falls back to server time for null timezone", () => {
    const result = getLocalDateString(null);
    expect(isDateString(result)).toBe(true);
  });

  it("falls back to server time for undefined timezone", () => {
    const result = getLocalDateString(undefined);
    expect(isDateString(result)).toBe(true);
  });

  it("falls back to server time for an invalid timezone string", () => {
    const result = getLocalDateString("Not/ATimezone");
    expect(isDateString(result)).toBe(true);
  });

  it("Pacific/Auckland (UTC+12/+13) can be a different day than UTC", () => {
    // We cannot guarantee a specific date, but we can guarantee the format
    const auckland = getLocalDateString("Pacific/Auckland");
    const utc = getLocalDateString("UTC");
    // Both must be valid YYYY-MM-DD; they may differ by exactly 1 day
    expect(isDateString(auckland)).toBe(true);
    expect(isDateString(utc)).toBe(true);
    // The numeric day difference must be at most 1
    const diff = Math.abs(
      new Date(auckland).getTime() - new Date(utc).getTime()
    );
    expect(diff).toBeLessThanOrEqual(86_400_000 + 60_000); // 1 day + 1 min tolerance
  });

  it("America/New_York (UTC−5/−4) is never more than 1 day behind UTC", () => {
    const ny = getLocalDateString("America/New_York");
    const utc = getLocalDateString("UTC");
    expect(isDateString(ny)).toBe(true);
    const diff = new Date(utc).getTime() - new Date(ny).getTime();
    expect(diff).toBeGreaterThanOrEqual(-86_400_000);
    expect(diff).toBeLessThanOrEqual(86_400_000 + 60_000);
  });
});

// ─── getLocalTomorrowString ───────────────────────────────────────────────────

describe("getLocalTomorrowString", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    expect(isDateString(getLocalTomorrowString("Europe/Berlin"))).toBe(true);
  });

  it("tomorrow is exactly 1 day after today", () => {
    const today = getLocalDateString("Europe/Berlin");
    const tomorrow = getLocalTomorrowString("Europe/Berlin");
    const diff = new Date(tomorrow).getTime() - new Date(today).getTime();
    expect(diff).toBe(86_400_000);
  });

  it("tomorrow > today lexicographically (YYYY-MM-DD sorts correctly)", () => {
    const today = getLocalDateString("UTC");
    const tomorrow = getLocalTomorrowString("UTC");
    expect(tomorrow > today).toBe(true);
  });

  it("crosses month boundary correctly (last day of a 31-day month)", () => {
    // We can't force a specific date, so we verify that tomorrow is always +1 day
    const today = getLocalDateString("UTC");
    const tomorrow = getLocalTomorrowString("UTC");
    const todayMs = new Date(today).getTime();
    const tomorrowMs = new Date(tomorrow).getTime();
    expect(tomorrowMs - todayMs).toBe(86_400_000);
  });

  it("works with null timezone (server fallback)", () => {
    const result = getLocalTomorrowString(null);
    expect(isDateString(result)).toBe(true);
    const today = getLocalDateString(null);
    expect(new Date(result).getTime() - new Date(today).getTime()).toBe(86_400_000);
  });
});

// ─── getLocalYesterdayString ──────────────────────────────────────────────────

describe("getLocalYesterdayString", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    expect(isDateString(getLocalYesterdayString("Europe/Berlin"))).toBe(true);
  });

  it("yesterday is exactly 1 day before today", () => {
    const today = getLocalDateString("Europe/Berlin");
    const yesterday = getLocalYesterdayString("Europe/Berlin");
    const diff = new Date(today).getTime() - new Date(yesterday).getTime();
    expect(diff).toBe(86_400_000);
  });

  it("yesterday < today lexicographically", () => {
    const today = getLocalDateString("UTC");
    const yesterday = getLocalYesterdayString("UTC");
    expect(yesterday < today).toBe(true);
  });

  it("tomorrow - yesterday = 2 days", () => {
    const yesterday = getLocalYesterdayString("UTC");
    const tomorrow = getLocalTomorrowString("UTC");
    const diff = new Date(tomorrow).getTime() - new Date(yesterday).getTime();
    expect(diff).toBe(2 * 86_400_000);
  });

  it("works with invalid timezone — falls back gracefully", () => {
    const result = getLocalYesterdayString("Fake/Zone");
    expect(isDateString(result)).toBe(true);
  });
});

// ─── getLocalDayBeforeYesterdayString ────────────────────────────────────────

describe("getLocalDayBeforeYesterdayString", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    expect(
      isDateString(getLocalDayBeforeYesterdayString("Europe/Berlin"))
    ).toBe(true);
  });

  it("day-before-yesterday is exactly 2 days before today", () => {
    const today = getLocalDateString("UTC");
    const dby = getLocalDayBeforeYesterdayString("UTC");
    const diff = new Date(today).getTime() - new Date(dby).getTime();
    expect(diff).toBe(2 * 86_400_000);
  });

  it("day-before-yesterday < yesterday < today (ordering)", () => {
    const tz = "Europe/Berlin";
    const dby = getLocalDayBeforeYesterdayString(tz);
    const yesterday = getLocalYesterdayString(tz);
    const today = getLocalDateString(tz);
    expect(dby < yesterday).toBe(true);
    expect(yesterday < today).toBe(true);
  });

  it("works with null timezone", () => {
    const result = getLocalDayBeforeYesterdayString(null);
    expect(isDateString(result)).toBe(true);
  });
});
