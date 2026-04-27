/**
 * Integration/unit tests for lib/gamification.ts:
 *   getLevelForCoins, getNextLevel, getUserStats, checkAndUnlockAchievements
 *
 * getLevelForCoins and getNextLevel are pure functions (no DB).
 * getUserStats and checkAndUnlockAchievements require the test DB.
 *
 * Every DB test runs against a real momo_test PostgreSQL database (no mocks).
 * The DB is reset to a clean state before each test by setup.ts.
 */

import { describe, it, expect } from "vitest";
import {
  getLevelForCoins,
  getNextLevel,
  getUserStats,
  checkAndUnlockAchievements,
  retroactivelyGrantAchievements,
  updateQuestStreak,
  updateStreak,
  LEVELS,
} from "@/lib/gamification";
import { getLocalDateString } from "@/lib/date-utils";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";

const TZ = "Europe/Berlin";

// ─── getLevelForCoins ─────────────────────────────────────────────────────────

describe("getLevelForCoins", () => {
  it("returns level 1 at 0 coins", () => {
    expect(getLevelForCoins(0).level).toBe(1);
  });

  it("returns level 1 just below the level-2 threshold", () => {
    expect(getLevelForCoins(49).level).toBe(1);
  });

  it("returns level 2 at exactly the level-2 threshold (50)", () => {
    expect(getLevelForCoins(50).level).toBe(2);
  });

  it("returns level 3 at 150 coins", () => {
    expect(getLevelForCoins(150).level).toBe(3);
  });

  it("returns level 5 at 500 coins", () => {
    expect(getLevelForCoins(500).level).toBe(5);
  });

  it("returns level 10 at the max threshold (3000)", () => {
    expect(getLevelForCoins(3000).level).toBe(10);
  });

  it("returns level 10 well above the max threshold", () => {
    expect(getLevelForCoins(99999).level).toBe(10);
  });

  it("returns correct title for each level", () => {
    for (const levelDef of LEVELS) {
      const result = getLevelForCoins(levelDef.minCoins);
      expect(result.level).toBe(levelDef.level);
      expect(result.title).toBe(levelDef.title);
    }
  });
});

// ─── getNextLevel ─────────────────────────────────────────────────────────────

describe("getNextLevel", () => {
  it("returns level 2 when current level is 1", () => {
    const next = getNextLevel(1);
    expect(next).not.toBeNull();
    expect(next!.level).toBe(2);
  });

  it("returns null at max level (10)", () => {
    const next = getNextLevel(10);
    expect(next).toBeNull();
  });

  it("returns the correct next level for each level", () => {
    for (let lvl = 1; lvl <= 9; lvl++) {
      const next = getNextLevel(lvl);
      expect(next).not.toBeNull();
      expect(next!.level).toBe(lvl + 1);
    }
  });
});

// ─── getUserStats ─────────────────────────────────────────────────────────────

describe("getUserStats", () => {
  it("returns correct coins and streakCurrent", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 42, streakCurrent: 7 });

    const stats = await getUserStats(user.id);

    expect(stats.coins).toBe(42);
    expect(stats.streakCurrent).toBe(7);
  });

  it("returns correct level based on DB level column", async () => {
    // getUserStats reads the level column from DB (set by completeTask),
    // not computed from coins — so we pass level: 3 directly.
    const user = await createTestUser({ timezone: TZ, coins: 150, level: 3 });

    const stats = await getUserStats(user.id);

    expect(stats.level).toBe(3);
  });

  it("streakShieldAvailable is true when streakShieldUsedMonth is null", async () => {
    const user = await createTestUser({
      timezone: TZ,
      streakShieldUsedMonth: null,
    });

    const stats = await getUserStats(user.id);

    expect(stats.streakShieldAvailable).toBe(true);
  });

  it("streakShieldAvailable is false when shield was used this month", async () => {
    const today = getLocalDateString(TZ);
    const currentMonth = today.slice(0, 7); // "YYYY-MM"
    const user = await createTestUser({
      timezone: TZ,
      streakShieldUsedMonth: currentMonth,
    });

    const stats = await getUserStats(user.id);

    expect(stats.streakShieldAvailable).toBe(false);
  });

  it("streakShieldAvailable is true when shield was used in a previous month", async () => {
    const user = await createTestUser({
      timezone: TZ,
      streakShieldUsedMonth: "2000-01", // definitely a past month
    });

    const stats = await getUserStats(user.id);

    expect(stats.streakShieldAvailable).toBe(true);
  });
});

// ─── getUserStats early-exit ──────────────────────────────────────────────────

describe("getUserStats — non-existent user", () => {
  it("returns default values for an unknown userId", async () => {
    const result = await getUserStats("00000000-0000-0000-0000-000000000000");
    expect(result.coins).toBe(0);
    expect(result.streakCurrent).toBe(0);
    expect(result.level).toBe(1);
    expect(result.streakShieldAvailable).toBe(true);
  });
});

// ─── updateStreak early-exit ─────────────────────────────────────────────────

describe("updateStreak — non-existent user", () => {
  it("returns zero streak for an unknown userId", async () => {
    const result = await updateStreak("00000000-0000-0000-0000-000000000000");
    expect(result.streakCurrent).toBe(0);
    expect(result.streakMax).toBe(0);
    expect(result.shieldUsed).toBe(false);
  });
});

// ─── checkAndUnlockAchievements ───────────────────────────────────────────────

describe("checkAndUnlockAchievements", () => {
  it("unlocks first_task on the first ever completion", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 0,
      coins: 0,
      level: 1,
    });

    const keys = result.unlocked.map((a) => a.key);
    expect(keys).toContain("first_task");
    expect(result.coinsAwarded).toBeGreaterThan(0);
  });

  it("unlocks streak-based achievement when streak threshold is reached", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 10,
      streakCurrent: 3,
      coins: 0,
      level: 1,
    });

    const keys = result.unlocked.map((a) => a.key);
    expect(keys).toContain("streak_3");
  });

  it("does not re-unlock an achievement already earned", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Unlock first_task once
    await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 0,
      coins: 0,
      level: 1,
    });

    // Try to unlock again
    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 0,
      coins: 0,
      level: 1,
    });

    // first_task should not be in the newly unlocked list
    const keys = result.unlocked.map((a) => a.key);
    expect(keys).not.toContain("first_task");
    expect(result.coinsAwarded).toBe(0);
  });

  it("awards the correct total coins (sum of all newly unlocked achievements)", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 3,
      coins: 0,
      level: 1,
    });

    const expectedCoins = result.unlocked.reduce((sum, a) => sum + a.coinReward, 0);
    expect(result.coinsAwarded).toBe(expectedCoins);
  });

  it("returns empty result when no achievement thresholds are met", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Complete 0 tasks — no achievements qualify
    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 0,
      streakCurrent: 0,
      coins: 0,
      level: 1,
    });

    expect(result.unlocked).toHaveLength(0);
    expect(result.coinsAwarded).toBe(0);
  });
});

// ─── retroactivelyGrantAchievements ──────────────────────────────────────────

describe("retroactivelyGrantAchievements", () => {
  it("returns 0 unlocked for a brand-new user with no activity", async () => {
    const user = await createTestUser({ timezone: TZ });
    const count = await retroactivelyGrantAchievements(user.id, TZ);
    expect(count).toBe(0);
  });

  it("grants first_task achievement when user has completed tasks", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Simulate a user who completed 1 task (insert a fake task_completions row)
    const task = await createTestTask(user.id, { completedAt: new Date() });
    await db.insert((await import("@/lib/db/schema")).taskCompletions).values({
      taskId: task.id,
      userId: user.id,
    });

    const count = await retroactivelyGrantAchievements(user.id, TZ);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("does not re-grant achievements already awarded", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { completedAt: new Date() });
    await db.insert((await import("@/lib/db/schema")).taskCompletions).values({
      taskId: task.id,
      userId: user.id,
    });

    // First call grants the achievement
    const first = await retroactivelyGrantAchievements(user.id, TZ);
    expect(first).toBeGreaterThanOrEqual(1);

    // Second call should grant 0 new achievements (all already unlocked)
    const second = await retroactivelyGrantAchievements(user.id, TZ);
    expect(second).toBe(0);
  });

  it("awards coins to the user for retroactively granted achievements", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 0 });
    const task = await createTestTask(user.id, { completedAt: new Date() });
    await db.insert((await import("@/lib/db/schema")).taskCompletions).values({
      taskId: task.id,
      userId: user.id,
    });

    await retroactivelyGrantAchievements(user.id, TZ);

    const [updated] = await db.select({ coins: users.coins }).from(users).where(eq(users.id, user.id));
    expect(updated.coins).toBeGreaterThan(0);
  });

  it("handles null timezone without throwing", async () => {
    const user = await createTestUser({ timezone: TZ });
    await expect(retroactivelyGrantAchievements(user.id, null)).resolves.toBeDefined();
  });
});

// ─── updateQuestStreak ────────────────────────────────────────────────────────

describe("updateQuestStreak", () => {
  it("returns questStreakCurrent=0 when user does not exist", async () => {
    const result = await updateQuestStreak("00000000-0000-0000-0000-000000000000", TZ);
    expect(result).toEqual({ questStreakCurrent: 0 });
  });

  it("returns the current streak unchanged when already updated today", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    // Prime the streak: set questStreakLastDate to today so the idempotent guard fires
    await db
      .update(users)
      .set({ questStreakCurrent: 5, questStreakLastDate: today })
      .where(eq(users.id, user.id));

    const result = await updateQuestStreak(user.id, TZ);
    expect(result).toEqual({ questStreakCurrent: 5 });
  });

  it("increments the streak when last date was yesterday", async () => {
    const user = await createTestUser({ timezone: TZ });
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    await db
      .update(users)
      .set({ questStreakCurrent: 3, questStreakLastDate: yesterdayStr })
      .where(eq(users.id, user.id));

    const result = await updateQuestStreak(user.id, TZ);
    expect(result.questStreakCurrent).toBe(4);
  });

  it("resets streak to 1 when last date was more than 1 day ago", async () => {
    const user = await createTestUser({ timezone: TZ });
    await db
      .update(users)
      .set({ questStreakCurrent: 10, questStreakLastDate: "2000-01-01" })
      .where(eq(users.id, user.id));

    const result = await updateQuestStreak(user.id, TZ);
    expect(result.questStreakCurrent).toBe(1);
  });
});

// ─── checkAndUnlockAchievements — secret/time-based achievements ───────────

describe("checkAndUnlockAchievements — secret achievements", () => {
  it("unlocks night_owl when completionHour is 23", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 0,
      coins: 0,
      level: 1,
      completionHour: 23,
    });

    const keys = result.unlocked.map((a) => a.key);
    expect(keys).toContain("night_owl");
  });

  it("unlocks early_bird when completionHour is 6", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 0,
      coins: 0,
      level: 1,
      completionHour: 6,
    });

    const keys = result.unlocked.map((a) => a.key);
    expect(keys).toContain("early_bird");
  });

  it("unlocks double_shift when dailyQuestCompletionsToday is 2", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 0,
      coins: 0,
      level: 1,
      dailyQuestCompletionsToday: 2,
    });

    const keys = result.unlocked.map((a) => a.key);
    expect(keys).toContain("double_shift");
  });

  it("does not unlock night_owl when completionHour is undefined", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await checkAndUnlockAchievements(user.id, {
      totalCompleted: 1,
      streakCurrent: 0,
      coins: 0,
      level: 1,
      // completionHour not set
    });

    const keys = result.unlocked.map((a) => a.key);
    expect(keys).not.toContain("night_owl");
    expect(keys).not.toContain("early_bird");
  });
});
