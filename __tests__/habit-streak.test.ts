/**
 * Unit tests for lib/habits.ts → computeHabitStreak()
 *
 * This is a pure function (no DB), so all tests are synchronous and run
 * without any test database setup. Tests cover all four recurrence types
 * (INTERVAL, WEEKDAY, MONTHLY, YEARLY), the grace rule for calendar-aligned
 * types, and paused ranges.
 */

import { describe, it, expect } from "vitest";
import { computeHabitStreak } from "@/lib/habits";

// Helper: generate a YYYY-MM-DD string offset by N days from base
function offsetDate(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split("T")[0];
}

const TODAY = "2025-06-15"; // stable reference date for all tests

// ─── INTERVAL ────────────────────────────────────────────────────────────────

describe("computeHabitStreak — INTERVAL", () => {
  it("returns 0 streak for no completions", () => {
    const result = computeHabitStreak([], 1, TODAY, undefined, "INTERVAL");
    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
  });

  it("returns streak of 1 for a single completion today", () => {
    const result = computeHabitStreak([TODAY], 1, TODAY, undefined, "INTERVAL");
    expect(result.current).toBe(1);
    expect(result.best).toBe(1);
  });

  it("counts consecutive daily completions", () => {
    // 5 consecutive days ending today
    const dates = [
      offsetDate(TODAY, -4),
      offsetDate(TODAY, -3),
      offsetDate(TODAY, -2),
      offsetDate(TODAY, -1),
      TODAY,
    ];
    const result = computeHabitStreak(dates, 1, TODAY, undefined, "INTERVAL");
    expect(result.current).toBe(5);
    expect(result.best).toBe(5);
  });

  it("streak resets at a gap", () => {
    // days: -5, -4, -3 ... gap ... -1, today
    const dates = [
      offsetDate(TODAY, -5),
      offsetDate(TODAY, -4),
      offsetDate(TODAY, -3),
      offsetDate(TODAY, -1),
      TODAY,
    ];
    const result = computeHabitStreak(dates, 1, TODAY, undefined, "INTERVAL");
    expect(result.current).toBe(2); // only -1 and today
    expect(result.best).toBe(3); // -5,-4,-3 was the longest run
  });

  it("respects recurrenceInterval > 1 (weekly = 7 days)", () => {
    // Completions every 7 days — 3 consecutive periods
    const dates = [
      offsetDate(TODAY, -14),
      offsetDate(TODAY, -7),
      TODAY,
    ];
    const result = computeHabitStreak(dates, 7, TODAY, undefined, "INTERVAL");
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
  });

  it("multiple completions in one period count as one period hit", () => {
    // Two completions today should still count as streak 1
    const result = computeHabitStreak([TODAY, TODAY], 1, TODAY, undefined, "INTERVAL");
    expect(result.current).toBe(1);
  });

  it("paused period counts as ok and does not break the streak", () => {
    const dates = [
      offsetDate(TODAY, -3), // period 3 → ok
      // period 2 is paused → ok
      offsetDate(TODAY, -1), // period 1 → ok
      TODAY,                  // period 0 → ok
    ];
    const paused = [{ from: offsetDate(TODAY, -2), to: offsetDate(TODAY, -2) }];
    const result = computeHabitStreak(dates, 1, TODAY, paused, "INTERVAL");
    expect(result.current).toBe(4);
  });
});

// ─── WEEKDAY ─────────────────────────────────────────────────────────────────

describe("computeHabitStreak — WEEKDAY", () => {
  it("returns 0 streak for no completions", () => {
    const result = computeHabitStreak([], 1, TODAY, undefined, "WEEKDAY");
    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
  });

  it("grace rule: period 0 empty → starts counting from period 1", () => {
    // Completion last week (period 1) but not this week (period 0)
    const lastWeek = offsetDate(TODAY, -7);
    const result = computeHabitStreak([lastWeek], 1, TODAY, undefined, "WEEKDAY");
    // Grace kicks in — streak is 1 (period 1), not 0
    expect(result.current).toBe(1);
  });

  it("counts 2-week streak when current week is completed", () => {
    const lastWeek = offsetDate(TODAY, -7);
    const result = computeHabitStreak([lastWeek, TODAY], 1, TODAY, undefined, "WEEKDAY");
    expect(result.current).toBe(2);
  });

  it("breaks when a week was missed", () => {
    // Period 2 (2 weeks ago) and period 0 (this week) — period 1 missing
    const twoWeeksAgo = offsetDate(TODAY, -14);
    const result = computeHabitStreak([twoWeeksAgo, TODAY], 1, TODAY, undefined, "WEEKDAY");
    expect(result.current).toBe(1); // only this week counts
    expect(result.best).toBe(1);
  });

  it("counts best streak correctly across multiple runs", () => {
    // 4 consecutive weeks, then gap, then 2 consecutive weeks
    const dates = [
      offsetDate(TODAY, -35),
      offsetDate(TODAY, -28),
      offsetDate(TODAY, -21),
      offsetDate(TODAY, -14),
      // gap: -7
      TODAY,
    ];
    const result = computeHabitStreak(dates, 1, TODAY, undefined, "WEEKDAY");
    expect(result.best).toBe(4);
  });
});

// ─── MONTHLY ─────────────────────────────────────────────────────────────────

describe("computeHabitStreak — MONTHLY", () => {
  it("returns 0 streak for no completions", () => {
    const result = computeHabitStreak([], 1, TODAY, undefined, "MONTHLY");
    expect(result.current).toBe(0);
  });

  it("grace rule: current month empty → starts counting from last month", () => {
    // Completion last month, none this month
    const lastMonth = offsetDate(TODAY, -30);
    const result = computeHabitStreak([lastMonth], 1, TODAY, undefined, "MONTHLY");
    expect(result.current).toBe(1);
  });

  it("counts 2-month streak", () => {
    const lastMonth = offsetDate(TODAY, -30);
    const result = computeHabitStreak([lastMonth, TODAY], 1, TODAY, undefined, "MONTHLY");
    expect(result.current).toBe(2);
  });

  it("breaks when a month is missed", () => {
    const twoMonthsAgo = offsetDate(TODAY, -60);
    const result = computeHabitStreak([twoMonthsAgo, TODAY], 1, TODAY, undefined, "MONTHLY");
    expect(result.current).toBe(1);
    expect(result.best).toBe(1);
  });

  it("counts 6-month streak correctly", () => {
    const dates = Array.from({ length: 6 }, (_, i) => offsetDate(TODAY, -i * 30));
    const result = computeHabitStreak(dates, 1, TODAY, undefined, "MONTHLY");
    expect(result.current).toBe(6);
    expect(result.best).toBe(6);
  });

  it("periodDays is 30 for MONTHLY", () => {
    const result = computeHabitStreak([], 1, TODAY, undefined, "MONTHLY");
    expect(result.periodDays).toBe(30);
  });
});

// ─── YEARLY ──────────────────────────────────────────────────────────────────

describe("computeHabitStreak — YEARLY", () => {
  it("returns 0 streak for no completions", () => {
    const result = computeHabitStreak([], 1, TODAY, undefined, "YEARLY");
    expect(result.current).toBe(0);
  });

  it("grace rule: current year empty → starts counting from last year", () => {
    const lastYear = offsetDate(TODAY, -365);
    const result = computeHabitStreak([lastYear], 1, TODAY, undefined, "YEARLY");
    expect(result.current).toBe(1);
  });

  it("counts 3-year streak", () => {
    const dates = [
      offsetDate(TODAY, -730), // 2 years ago
      offsetDate(TODAY, -365), // 1 year ago
      TODAY,
    ];
    const result = computeHabitStreak(dates, 1, TODAY, undefined, "YEARLY");
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
  });

  it("periodDays is 365 for YEARLY", () => {
    const result = computeHabitStreak([], 1, TODAY, undefined, "YEARLY");
    expect(result.periodDays).toBe(365);
  });
});

// ─── Paused ranges ────────────────────────────────────────────────────────────

describe("computeHabitStreak — paused ranges", () => {
  it("WEEKDAY: paused week counts as ok (no break)", () => {
    const lastWeek = offsetDate(TODAY, -7);
    const twoWeeksAgo = offsetDate(TODAY, -14);
    // Completed 2 weeks ago and this week, but last week was paused
    const paused = [{ from: lastWeek, to: lastWeek }];
    const result = computeHabitStreak([twoWeeksAgo, TODAY], 1, TODAY, paused, "WEEKDAY");
    expect(result.current).toBe(3); // 2-weeks-ago + paused-week + this-week
  });

  it("INTERVAL: no paused ranges (undefined) handled gracefully", () => {
    const dates = [TODAY];
    const result = computeHabitStreak(dates, 1, TODAY, undefined, "INTERVAL");
    expect(result.current).toBe(1);
  });

  it("INTERVAL: empty paused ranges array handled gracefully", () => {
    const dates = [TODAY];
    const result = computeHabitStreak(dates, 1, TODAY, [], "INTERVAL");
    expect(result.current).toBe(1);
  });
});
