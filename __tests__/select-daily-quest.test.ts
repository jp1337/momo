/**
 * Integration tests for lib/daily-quest.ts → selectDailyQuest()
 *
 * Every test runs against a real momo_test PostgreSQL database (no mocks).
 * The DB is reset to a clean state before each test by setup.ts.
 *
 * Scenarios covered:
 *  1. Priority 1 — oldest overdue task is picked before others
 *  2. Priority 2 — HIGH-priority topic subtask beats non-overdue pool
 *  3. Priority 3 — due recurring task is picked when no Tier-1/2 candidates
 *  4. Priority 4 — fallback to random ONE_TIME/DAILY_ELIGIBLE task
 *  5. Snoozed tasks are excluded
 *  6. Paused tasks (vacation mode) are excluded
 *  7. Completed tasks are excluded
 *  8. Idempotent — already-active quest returned without re-selecting
 *  9. Sequential topic — only the first open task is eligible
 * 10. Energy preference — matching-energy task preferred over untagged
 * 11. Energy fallback — returns any task when no energy match exists
 * 12. Returns null when no eligible tasks exist
 */

import { describe, it, expect } from "vitest";
import { selectDailyQuest } from "@/lib/daily-quest";
import { createTestUser, createTestTopic, createTestTask, createTestRecurringTask } from "./helpers/fixtures";
import { getLocalDateString, getLocalYesterdayString, getLocalTomorrowString } from "@/lib/date-utils";

const TZ = "Europe/Berlin";

describe("selectDailyQuest", () => {
  it("Priority 1: picks the oldest overdue ONE_TIME task first", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    const yesterday = getLocalYesterdayString(TZ);

    // Overdue task (should win)
    const overdue = await createTestTask(user.id, {
      topicId: topic.id,
      title: "Overdue Task",
      type: "ONE_TIME",
      dueDate: yesterday,
      priority: "NORMAL",
    });
    // Non-overdue competitor
    await createTestTask(user.id, {
      topicId: topic.id,
      title: "Normal Task",
      type: "ONE_TIME",
      priority: "NORMAL",
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(overdue.id);
    expect(result!.isDailyQuest).toBe(true);
  });

  it("Priority 2: picks a HIGH-priority topic subtask when no overdue tasks exist", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);

    // Normal task in pool (would be Tier-4)
    await createTestTask(user.id, {
      title: "Normal Pool Task",
      type: "ONE_TIME",
      priority: "NORMAL",
    });
    // HIGH priority task with topic (should win)
    const highPrio = await createTestTask(user.id, {
      topicId: topic.id,
      title: "High Priority Task",
      type: "ONE_TIME",
      priority: "HIGH",
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(highPrio.id);
  });

  it("Priority 3: picks a due recurring task when no Tier-1/2 candidates exist", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    // Regular ONE_TIME task (Tier-4 fallback)
    await createTestTask(user.id, {
      title: "One Time Task",
      type: "ONE_TIME",
    });
    // Due recurring (should win over Tier-4)
    const recurring = await createTestRecurringTask(user.id, {
      title: "Recurring Due Today",
      nextDueDate: today,
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(recurring.id);
  });

  it("Priority 4: falls back to a ONE_TIME task from the pool when nothing else applies", async () => {
    const user = await createTestUser({ timezone: TZ });

    const task = await createTestTask(user.id, {
      title: "Pool Task",
      type: "ONE_TIME",
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(task.id);
    expect(result!.isDailyQuest).toBe(true);
    expect(result!.dailyQuestDate).toBe(getLocalDateString(TZ));
  });

  it("DAILY_ELIGIBLE tasks are included in the Tier-4 pool", async () => {
    const user = await createTestUser({ timezone: TZ });

    const task = await createTestTask(user.id, {
      title: "Daily Eligible Task",
      type: "DAILY_ELIGIBLE",
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(task.id);
  });

  it("excludes snoozed tasks from quest selection", async () => {
    const user = await createTestUser({ timezone: TZ });
    const tomorrow = getLocalTomorrowString(TZ);

    // Snoozed until tomorrow — should not be picked
    await createTestTask(user.id, {
      title: "Snoozed Task",
      type: "ONE_TIME",
      snoozedUntil: tomorrow,
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).toBeNull();
  });

  it("excludes paused tasks (vacation mode) from quest selection", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    // Paused until today (inclusive) — should not be picked
    await createTestTask(user.id, {
      title: "Paused Task",
      type: "RECURRING",
      nextDueDate: today,
      pausedUntil: today,
      pausedAt: today,
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).toBeNull();
  });

  it("excludes completed ONE_TIME tasks from quest selection", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Already completed — should not be picked
    await createTestTask(user.id, {
      title: "Done Task",
      type: "ONE_TIME",
      completedAt: new Date(),
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).toBeNull();
  });

  it("is idempotent — returns the already-assigned quest without re-selecting", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    const existing = await createTestTask(user.id, {
      title: "Existing Quest",
      type: "ONE_TIME",
      isDailyQuest: true,
      dailyQuestDate: today,
    });
    // Another candidate — should not displace the existing quest
    await createTestTask(user.id, {
      title: "Other Task",
      type: "ONE_TIME",
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(existing.id);
  });

  it("sequential topic: only the first open task is eligible", async () => {
    const user = await createTestUser({ timezone: TZ });
    const seqTopic = await createTestTopic(user.id, { sequential: true });

    // First task in sequential topic (sortOrder 0) — should win
    const first = await createTestTask(user.id, {
      topicId: seqTopic.id,
      title: "First Task",
      type: "ONE_TIME",
      sortOrder: 0,
    });
    // Second task in sequential topic (sortOrder 1) — should be blocked
    await createTestTask(user.id, {
      topicId: seqTopic.id,
      title: "Second Task",
      type: "ONE_TIME",
      sortOrder: 1,
    });

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(first.id);
  });

  it("energy preference: prefers a task matching the user's energy level", async () => {
    const user = await createTestUser({ timezone: TZ, energyLevel: "HIGH" });

    // LOW energy task — does NOT match HIGH preference, falls to fallback pool
    await createTestTask(user.id, {
      title: "Low Energy Task",
      type: "ONE_TIME",
      energyLevel: "LOW",
    });
    // HIGH energy task — strictly matches, so the preferred subset is deterministic
    const highEnergy = await createTestTask(user.id, {
      title: "High Energy Task",
      type: "ONE_TIME",
      energyLevel: "HIGH",
    });

    const result = await selectDailyQuest(user.id, TZ, "HIGH");

    expect(result).not.toBeNull();
    expect(result!.id).toBe(highEnergy.id);
  });

  it("energy fallback: returns any task when no energy match exists", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Only a LOW energy task — user is HIGH but we should still get a result
    const lowEnergy = await createTestTask(user.id, {
      title: "Low Energy Task",
      type: "ONE_TIME",
      energyLevel: "LOW",
    });

    const result = await selectDailyQuest(user.id, TZ, "HIGH");

    expect(result).not.toBeNull();
    expect(result!.id).toBe(lowEnergy.id);
  });

  it("returns null when no eligible tasks exist", async () => {
    const user = await createTestUser({ timezone: TZ });
    // No tasks inserted

    const result = await selectDailyQuest(user.id, TZ);

    expect(result).toBeNull();
  });
});
