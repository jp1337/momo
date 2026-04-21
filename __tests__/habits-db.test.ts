/**
 * Tests for lib/habits.ts.
 *
 * buildYearOptions and computeHabitStreak are pure functions — no DB needed.
 * getHabitsWithHistory and getEarliestCompletion require the test database.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { taskCompletions } from "@/lib/db/schema";
import {
  getHabitsWithHistory,
  getEarliestCompletion,
  buildYearOptions,
  computeHabitStreak,
} from "@/lib/habits";
import { createTestUser, createTestRecurringTask, createTestTask } from "./helpers/fixtures";
import { getLocalDateString } from "@/lib/date-utils";

const TZ = "Europe/Berlin";

// ─── buildYearOptions (pure) ──────────────────────────────────────────────────

describe("buildYearOptions", () => {
  it("returns only the current year when there are no completions", () => {
    const years = buildYearOptions(null, 2025);
    expect(years).toEqual([2025]);
  });

  it("returns current year when earliest completion is this year", () => {
    const years = buildYearOptions(new Date("2025-06-01"), 2025);
    expect(years).toContain(2025);
    expect(years.every((y) => y <= 2025)).toBe(true);
  });

  it("spans back at most 4 years from current year", () => {
    // earliest is way back — should be capped at currentYear - 4
    const years = buildYearOptions(new Date("2010-01-01"), 2025);
    expect(Math.min(...years)).toBe(2021); // 2025 - 4
    expect(Math.max(...years)).toBe(2025);
  });

  it("returns years in descending order", () => {
    const years = buildYearOptions(new Date("2022-01-01"), 2025);
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBeLessThan(years[i - 1]);
    }
  });

  it("earliest completion within 4-year window — uses actual earliest year", () => {
    const years = buildYearOptions(new Date("2023-03-15"), 2025);
    expect(years).toContain(2023);
    expect(years).toContain(2025);
    expect(years).not.toContain(2022);
  });
});

// ─── computeHabitStreak (pure) ────────────────────────────────────────────────

describe("computeHabitStreak", () => {
  const TODAY = "2025-01-10";

  it("returns zero streak for no completions", () => {
    const result = computeHabitStreak([], 1, TODAY);
    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
  });

  it("returns streak of 1 when only today has a completion", () => {
    const result = computeHabitStreak([TODAY], 1, TODAY);
    expect(result.current).toBe(1);
    expect(result.best).toBe(1);
  });

  it("counts consecutive daily completions (INTERVAL=1)", () => {
    // 3 consecutive days ending today
    const dates = ["2025-01-08", "2025-01-09", "2025-01-10"];
    const result = computeHabitStreak(dates, 1, TODAY);
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
  });

  it("resets streak on a gap", () => {
    // gap on 2025-01-09 — only today completed
    const result = computeHabitStreak(["2025-01-08", TODAY], 1, TODAY);
    // period for today = 0, yesterday (gap) = 1, so current = 1 (today only; yesterday gap breaks)
    expect(result.current).toBe(1);
  });

  it("grace rule: current streak is non-zero even if today has no completion (counts from yesterday)", () => {
    // yesterday completed but not today
    const result = computeHabitStreak(["2025-01-09"], 1, TODAY);
    // period 0 = today (empty), so we start from period 1 (yesterday) — current = 1
    expect(result.current).toBe(1);
  });

  it("best streak survives across a gap that was in the past", () => {
    // 4-day streak last week, then gap, then 2 days
    const dates = [
      "2024-12-30", "2024-12-31", "2025-01-01", "2025-01-02", // 4 consecutive
      // gap on 01-03 … 01-07
      "2025-01-09", TODAY, // 2 consecutive
    ];
    const result = computeHabitStreak(dates, 1, TODAY);
    expect(result.best).toBeGreaterThanOrEqual(4);
  });

  it("WEEKDAY type: streak of 1 if only current week has a completion", () => {
    // Use a Monday as today so the week is clear
    const monday = "2025-01-06";
    const result = computeHabitStreak([monday], null, monday, undefined, "WEEKDAY");
    expect(result.current).toBeGreaterThanOrEqual(1);
    expect(result.periodDays).toBe(7);
  });

  it("MONTHLY type: returns periodDays = 30", () => {
    const result = computeHabitStreak(["2025-01-10"], null, TODAY, undefined, "MONTHLY");
    expect(result.periodDays).toBe(30);
  });

  it("YEARLY type: returns periodDays = 365", () => {
    const result = computeHabitStreak(["2025-01-10"], null, TODAY, undefined, "YEARLY");
    expect(result.periodDays).toBe(365);
  });

  it("paused range counts as ok — does not break streak", () => {
    // Day 2 is paused; days 1, 3 are completed → streak should not be broken
    const pause = [{ from: "2025-01-09", to: "2025-01-09" }];
    const result = computeHabitStreak(["2025-01-08", TODAY], 1, TODAY, pause);
    // Period 0 = today (ok), period 1 = yesterday (paused, ok), period 2 = 01-08 (ok)
    expect(result.current).toBeGreaterThanOrEqual(2);
  });
});

// ─── getEarliestCompletion ────────────────────────────────────────────────────

describe("getEarliestCompletion", () => {
  it("returns null when user has no completions", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await getEarliestCompletion(user.id);
    expect(result).toBeNull();
  });

  it("returns the earliest completion date when completions exist", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Repeated" });

    const early = new Date("2023-05-01T10:00:00Z");
    const later = new Date("2024-01-15T10:00:00Z");

    await db.insert(taskCompletions).values([
      { taskId: task.id, userId: user.id, completedAt: later },
      { taskId: task.id, userId: user.id, completedAt: early },
    ]);

    const result = await getEarliestCompletion(user.id);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(early.getTime());
  });

  it("isolates completions by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const taskA = await createTestTask(userA.id);

    await db.insert(taskCompletions).values({
      taskId: taskA.id,
      userId: userA.id,
      completedAt: new Date("2023-01-01T00:00:00Z"),
    });

    const result = await getEarliestCompletion(userB.id);
    expect(result).toBeNull();
  });
});

// ─── getHabitsWithHistory ─────────────────────────────────────────────────────

describe("getHabitsWithHistory", () => {
  const YEAR = new Date().getFullYear();

  it("returns empty array when user has no recurring tasks", async () => {
    const user = await createTestUser({ timezone: TZ });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits).toHaveLength(0);
  });

  it("returns the recurring task with empty completions if never completed", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestRecurringTask(user.id, { title: "Daily Run", timezone: TZ });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe("Daily Run");
    expect(habits[0].completions).toHaveLength(0);
  });

  it("does NOT return ONE_TIME tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTask(user.id, { type: "ONE_TIME", title: "One Off" });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits).toHaveLength(0);
  });

  it("counts completions in the requested year", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestRecurringTask(user.id, { timezone: TZ });

    const thisYear = new Date(`${YEAR}-06-15T10:00:00Z`);
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: thisYear,
    });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits[0].totalYear).toBeGreaterThanOrEqual(1);
  });

  it("calculates rolling 30-day total", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestRecurringTask(user.id, { timezone: TZ });

    // Insert a completion 5 days ago (inside 30-day window)
    const recent = new Date();
    recent.setUTCDate(recent.getUTCDate() - 5);
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: recent,
    });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits[0].totalLast30).toBeGreaterThanOrEqual(1);
  });

  it("calculates rolling 7-day total", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestRecurringTask(user.id, { timezone: TZ });

    // Completion 2 days ago — inside 7-day window
    const recent = new Date();
    recent.setUTCDate(recent.getUTCDate() - 2);
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: recent,
    });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits[0].totalLast7).toBeGreaterThanOrEqual(1);
  });

  it("populates streak from all-time completion history", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestRecurringTask(user.id, { timezone: TZ });

    // Today completion → streak of at least 1
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: new Date(),
    });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits[0].streak.current).toBeGreaterThanOrEqual(1);
    expect(habits[0].streak.best).toBeGreaterThanOrEqual(1);
  });

  it("isolates tasks by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createTestRecurringTask(userA.id, { timezone: TZ });

    const habits = await getHabitsWithHistory(userB.id, YEAR, TZ);
    expect(habits).toHaveLength(0);
  });

  it("marks paused tasks correctly", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestRecurringTask(user.id, {
      timezone: TZ,
      pausedAt: today,
      pausedUntil: today,
    });

    const habits = await getHabitsWithHistory(user.id, YEAR, TZ);
    expect(habits[0].paused).toBe(true);
  });
});
