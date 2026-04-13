/**
 * Integration tests for lib/tasks.ts → completeTask()
 *
 * Every test runs against a real momo_test PostgreSQL database (no mocks).
 * The DB is reset to a clean state before each test by setup.ts.
 *
 * Scenarios covered:
 *  1. ONE_TIME task — completedAt is set, task_completions entry created
 *  2. RECURRING task — nextDueDate advances by recurrenceInterval, no completedAt
 *  3. Coins awarded correctly (coinValue)
 *  4. Double coins for tasks postponed 3+ times
 *  5. Streak incremented when last completion was yesterday
 *  6. Streak shield activated when exactly one day was missed
 *  7. Achievement "first_task" unlocked on first ever completion
 *  8. Error thrown when completing an already-completed ONE_TIME task (idempotent)
 *  9. Quest streak incremented when task is the daily quest
 * 10. Error thrown when completing a paused task (vacation mode)
 */

import { describe, it, expect } from "vitest";
import { completeTask } from "@/lib/tasks";
import { db } from "@/lib/db";
import { users, tasks, taskCompletions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import {
  getLocalDateString,
  getLocalYesterdayString,
  getLocalDayBeforeYesterdayString,
  getLocalTomorrowString,
} from "@/lib/date-utils";
import { createTestUser, createTestTask, createTestRecurringTask } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

/** Read back task row from DB */
async function getTask(taskId: string) {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  return row;
}

/** Read back user row from DB */
async function getUser(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  return row;
}

/** Count task_completions for a user */
async function completionCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(taskCompletions)
    .where(eq(taskCompletions.userId, userId));
  return Number(row?.count ?? 0);
}

describe("completeTask", () => {
  it("sets completedAt and creates a task_completions entry for a ONE_TIME task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { type: "ONE_TIME" });

    const before = new Date();
    await completeTask(task.id, user.id, TZ);
    const after = new Date();

    const updated = await getTask(task.id);
    expect(updated.completedAt).not.toBeNull();
    expect(updated.completedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated.completedAt!.getTime()).toBeLessThanOrEqual(after.getTime());

    expect(await completionCount(user.id)).toBe(1);
  });

  it("advances nextDueDate for a RECURRING task without setting completedAt", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestRecurringTask(user.id, {
      recurrenceInterval: 7,
      nextDueDate: today,
    });

    await completeTask(task.id, user.id, TZ);

    const updated = await getTask(task.id);
    expect(updated.completedAt).toBeNull(); // no completedAt for recurring
    expect(updated.nextDueDate).not.toBe(today); // date advanced
    // 7 days from today
    const [y, m, d] = today.split("-").map(Number);
    const expected = new Date(Date.UTC(y, m - 1, d + 7)).toISOString().split("T")[0];
    expect(updated.nextDueDate).toBe(expected);

    expect(await completionCount(user.id)).toBe(1);
  });

  it("awards coins equal to coinValue", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 0 });
    const task = await createTestTask(user.id, { coinValue: 3 });

    const result = await completeTask(task.id, user.id, TZ);

    expect(result.coinsEarned).toBe(3);
    const updated = await getUser(user.id);
    // coins = 3 (task) + achievementCoinsEarned (first_task = 10)
    expect(updated.coins).toBeGreaterThanOrEqual(3);
  });

  it("awards double coins when postponeCount is 3 or more", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 0 });
    const task = await createTestTask(user.id, {
      coinValue: 2,
      postponeCount: 3, // procrastination reward
    });

    const result = await completeTask(task.id, user.id, TZ);

    expect(result.coinsEarned).toBe(4); // 2 * 2 = double coins
  });

  it("increments the streak when last completion was yesterday", async () => {
    const yesterday = getLocalYesterdayString(TZ);
    const user = await createTestUser({
      timezone: TZ,
      streakCurrent: 4,
      streakLastDate: yesterday,
    });
    const task = await createTestTask(user.id);

    const result = await completeTask(task.id, user.id, TZ);

    expect(result.streakCurrent).toBe(5);
    expect(result.shieldUsed).toBe(false);
  });

  it("activates streak shield when exactly one day was missed and shield is available", async () => {
    const dayBeforeYesterday = getLocalDayBeforeYesterdayString(TZ);
    const user = await createTestUser({
      timezone: TZ,
      streakCurrent: 8,
      streakMax: 8,
      streakLastDate: dayBeforeYesterday,
      streakShieldUsedMonth: null, // shield available
    });
    const task = await createTestTask(user.id);

    const result = await completeTask(task.id, user.id, TZ);

    expect(result.shieldUsed).toBe(true);
    expect(result.streakCurrent).toBe(8); // streak preserved, not incremented
  });

  it("unlocks the first_task achievement on the first ever completion", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id);

    const result = await completeTask(task.id, user.id, TZ);

    const keys = result.unlockedAchievements.map((a) => a.key);
    expect(keys).toContain("first_task");

    // Achievement coins should have been awarded
    expect(result.achievementCoinsEarned).toBeGreaterThan(0);
  });

  it("throws an error when trying to complete an already-completed ONE_TIME task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { completedAt: new Date() });

    await expect(completeTask(task.id, user.id, TZ)).rejects.toThrow(
      "Task is already completed"
    );
  });

  it("throws an error when the task does not belong to the user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const task = await createTestTask(owner.id);

    await expect(completeTask(task.id, other.id, TZ)).rejects.toThrow(
      "Task not found or access denied"
    );
  });

  it("increments quest streak when the task is the active daily quest", async () => {
    const yesterday = getLocalYesterdayString(TZ);
    const user = await createTestUser({
      timezone: TZ,
      questStreakCurrent: 2,
      questStreakLastDate: yesterday,
    });
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: getLocalDateString(TZ),
    });

    await completeTask(task.id, user.id, TZ);

    const updated = await getUser(user.id);
    expect(updated.questStreakCurrent).toBe(3);
    expect(updated.questStreakLastDate).toBe(getLocalDateString(TZ));
  });

  it("throws an error when completing a currently paused task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestRecurringTask(user.id, {
      pausedUntil: getLocalTomorrowString(TZ), // paused until tomorrow
      pausedAt: today,
    });

    await expect(completeTask(task.id, user.id, TZ)).rejects.toThrow(
      "Cannot complete a paused task"
    );
  });
});
