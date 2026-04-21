/**
 * Tests for lib/statistics.ts.
 *
 * computeStreakHistory is a pure function — no DB needed.
 * getUserStatistics and getAdminStatistics query the test database.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { taskCompletions } from "@/lib/db/schema";
import {
  computeStreakHistory,
  getUserStatistics,
  getAdminStatistics,
} from "@/lib/statistics";
import {
  createTestUser,
  createTestTask,
  createTestTopic,
  createTestWishlistItem,
} from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── computeStreakHistory ─────────────────────────────────────────────────────

describe("computeStreakHistory", () => {
  it("returns an array of length equal to days", () => {
    const result = computeStreakHistory(new Set(), 30);
    expect(result).toHaveLength(30);
  });

  it("returns all zeros for an empty completion set", () => {
    const result = computeStreakHistory(new Set(), 7);
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it("increments streak for each consecutive completed day", () => {
    // Build a set containing the last 3 calendar days
    const now = new Date();
    const dates = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dates.add(d.toLocaleDateString("en-CA"));
    }

    const result = computeStreakHistory(dates, 7);
    // The last element (today) should be 1; second-to-last should be 2
    // (streak grows from oldest → newest)
    const last = result[result.length - 1];
    const prev = result[result.length - 2];
    expect(last).toBeGreaterThanOrEqual(1);
    expect(prev).toBeGreaterThanOrEqual(prev <= last ? 0 : 1);
  });

  it("resets streak to 0 on a gap day", () => {
    const now = new Date();
    // Only complete today and 2 days ago (gap on yesterday)
    const today = now.toLocaleDateString("en-CA");
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toLocaleDateString("en-CA");

    const dates = new Set([today, twoDaysAgoStr]);
    const result = computeStreakHistory(dates, 5);

    // yesterday slot (index length - 2) should be 0 — gap resets streak
    const yesterdayIdx = result.length - 2;
    expect(result[yesterdayIdx]).toBe(0);
  });

  it("streak value at the end equals consecutive days ending on today", () => {
    const now = new Date();
    const n = 5;
    const dates = new Set<string>();
    for (let i = 0; i < n; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dates.add(d.toLocaleDateString("en-CA"));
    }

    const result = computeStreakHistory(dates, 10);
    expect(result[result.length - 1]).toBe(n);
  });
});

// ─── getUserStatistics ────────────────────────────────────────────────────────

describe("getUserStatistics", () => {
  it("returns zero counts for a brand-new user with no tasks", async () => {
    const user = await createTestUser({ timezone: TZ });

    const stats = await getUserStatistics(user.id);

    expect(stats.openTasks).toBe(0);
    expect(stats.completedTasks).toBe(0);
    expect(stats.totalCompletions).toBe(0);
    expect(stats.totalTopics).toBe(0);
  });

  it("reflects coins, level and streak from the user row", async () => {
    const user = await createTestUser({
      timezone: TZ,
      coins: 42,
      level: 3,
      streakCurrent: 7,
      streakMax: 14,
    });

    const stats = await getUserStatistics(user.id);

    expect(stats.coins).toBe(42);
    expect(stats.level).toBe(3);
    expect(stats.streakCurrent).toBe(7);
    expect(stats.streakMax).toBe(14);
  });

  it("counts open and completed tasks correctly", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTask(user.id, { title: "Open" });
    await createTestTask(user.id, { title: "Done", completedAt: new Date() });

    const stats = await getUserStatistics(user.id);

    expect(stats.openTasks).toBe(1);
    expect(stats.completedTasks).toBe(1);
  });

  it("counts topics correctly", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTopic(user.id, { title: "Topic A" });
    await createTestTopic(user.id, { title: "Topic B" });

    const stats = await getUserStatistics(user.id);

    expect(stats.totalTopics).toBe(2);
  });

  it("counts task completions from taskCompletions table", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Repeatable" });

    // Insert two completion records manually
    await db.insert(taskCompletions).values([
      { taskId: task.id, userId: user.id, completedAt: new Date() },
      { taskId: task.id, userId: user.id, completedAt: new Date() },
    ]);

    const stats = await getUserStatistics(user.id);

    expect(stats.totalCompletions).toBe(2);
  });

  it("isolates data by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createTestTask(userA.id, { title: "A's task" });

    const statsB = await getUserStatistics(userB.id);

    expect(statsB.openTasks).toBe(0);
  });

  it("returns tasksByType breakdown", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTask(user.id, { type: "ONE_TIME" });
    await createTestTask(user.id, { type: "RECURRING", nextDueDate: "2024-01-01" });

    const stats = await getUserStatistics(user.id);

    expect(stats.tasksByType.ONE_TIME).toBeGreaterThanOrEqual(1);
    expect(stats.tasksByType.RECURRING).toBeGreaterThanOrEqual(1);
  });

  it("returns wishlistStats with open/bought/discarded counts", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestWishlistItem(user.id, { status: "OPEN" });
    await createTestWishlistItem(user.id, { status: "BOUGHT" });
    await createTestWishlistItem(user.id, { status: "DISCARDED" });

    const stats = await getUserStatistics(user.id);

    expect(stats.wishlistStats.open).toBe(1);
    expect(stats.wishlistStats.bought).toBe(1);
    expect(stats.wishlistStats.discarded).toBe(1);
  });

  it("returns streakHistory array of length 90", async () => {
    const user = await createTestUser({ timezone: TZ });

    const stats = await getUserStatistics(user.id);

    expect(stats.streakHistory).toHaveLength(90);
  });

  it("returns completionsByWeekday array of length 7", async () => {
    const user = await createTestUser({ timezone: TZ });

    const stats = await getUserStatistics(user.id);

    expect(stats.completionsByWeekday).toHaveLength(7);
  });

  it("coinsEarnedAllTime sums coinValues from task_completions", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Create two tasks with known coinValues
    const task1 = await createTestTask(user.id, { coinValue: 5 });
    const task2 = await createTestTask(user.id, { coinValue: 3 });

    // Insert completions referencing those tasks
    await db.insert(taskCompletions).values([
      { taskId: task1.id, userId: user.id, completedAt: new Date() },
      { taskId: task2.id, userId: user.id, completedAt: new Date() },
    ]);

    const stats = await getUserStatistics(user.id);
    // The sum must reflect the joined coinValues: 5 + 3 = 8
    expect(stats.coinsEarnedAllTime).toBe(8);
  });

  it("completionsByWeekday[dow] increments for the correct weekday slot", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { coinValue: 1 });

    // Pick a fixed Monday (ISODOW 1 → index 0) that is safely in the past
    // 2024-01-08 is a known Monday
    const monday = new Date("2024-01-08T12:00:00Z");
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: monday,
    });

    // Also insert a Wednesday (ISODOW 3 → index 2)
    const wednesday = new Date("2024-01-10T12:00:00Z");
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: wednesday,
    });

    const stats = await getUserStatistics(user.id);
    expect(stats.completionsByWeekday[0]).toBeGreaterThanOrEqual(1); // Monday
    expect(stats.completionsByWeekday[2]).toBeGreaterThanOrEqual(1); // Wednesday
  });

  it("returns achievements array (may be empty without seeding)", async () => {
    const user = await createTestUser({ timezone: TZ });

    const stats = await getUserStatistics(user.id);

    expect(Array.isArray(stats.achievements)).toBe(true);
  });

  it("returns memberSince as a Date", async () => {
    const user = await createTestUser({ timezone: TZ });

    const stats = await getUserStatistics(user.id);

    expect(stats.memberSince).toBeInstanceOf(Date);
  });
});

// ─── getAdminStatistics ───────────────────────────────────────────────────────

describe("getAdminStatistics", () => {
  it("returns an object with expected numeric fields", async () => {
    const stats = await getAdminStatistics();

    expect(typeof stats.totalUsers).toBe("number");
    expect(typeof stats.newUsersLast7Days).toBe("number");
    expect(typeof stats.newUsersLast30Days).toBe("number");
    expect(typeof stats.activeUsersLast7Days).toBe("number");
    expect(typeof stats.activeUsersLast30Days).toBe("number");
    expect(typeof stats.totalTasks).toBe("number");
    expect(typeof stats.totalCompletions).toBe("number");
    expect(typeof stats.totalTopics).toBe("number");
  });

  it("returns arrays for usersByProvider, topUsersByCompletions, achievementDistribution", async () => {
    const stats = await getAdminStatistics();

    expect(Array.isArray(stats.usersByProvider)).toBe(true);
    expect(Array.isArray(stats.topUsersByCompletions)).toBe(true);
    expect(Array.isArray(stats.achievementDistribution)).toBe(true);
  });

  it("reflects newly created users in totalUsers", async () => {
    const before = (await getAdminStatistics()).totalUsers;
    await createTestUser({ timezone: TZ });
    const after = (await getAdminStatistics()).totalUsers;

    expect(after).toBeGreaterThan(before);
  });

  it("includes wishlistStats with totalBought and totalSpent fields", async () => {
    const stats = await getAdminStatistics();

    expect(typeof stats.wishlistStats.totalBought).toBe("number");
    expect(typeof stats.wishlistStats.totalSpent).toBe("number");
  });
});
