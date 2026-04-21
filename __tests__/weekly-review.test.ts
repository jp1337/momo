/**
 * Integration tests for lib/weekly-review.ts → getWeeklyReview().
 *
 * Tests the weekly performance summary: completions, streak, coins, and
 * top-topics aggregation. Task completions are inserted directly into the
 * taskCompletions table (no gamification side-effects needed).
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { taskCompletions } from "@/lib/db/schema";
import { getWeeklyReview } from "@/lib/weekly-review";
import { createTestUser, createTestTopic, createTestTask } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

describe("getWeeklyReview", () => {
  it("returns zeroed review when user has no completions", async () => {
    const user = await createTestUser({ timezone: TZ });
    const review = await getWeeklyReview(user.id, TZ);

    expect(review.completionsThisWeek).toBe(0);
    expect(review.coinsEarnedThisWeek).toBe(0);
    expect(review.streakCurrent).toBe(0);
  });

  it("counts task completions within the current week", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task1 = await createTestTask(user.id, { title: "T1", coinValue: 3 });
    const task2 = await createTestTask(user.id, { title: "T2", coinValue: 2 });

    // Insert completions with timestamps in the current week
    const now = new Date();
    await db.insert(taskCompletions).values([
      { taskId: task1.id, userId: user.id, completedAt: now },
      { taskId: task2.id, userId: user.id, completedAt: now },
    ]);

    const review = await getWeeklyReview(user.id, TZ);
    expect(review.completionsThisWeek).toBe(2);
    expect(review.coinsEarnedThisWeek).toBe(5); // 3 + 2
  });

  it("does not count completions from the previous week", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Old Task" });

    // Insert a completion 8 days ago (before the current week started)
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000);
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: eightDaysAgo,
    });

    const review = await getWeeklyReview(user.id, TZ);
    expect(review.completionsThisWeek).toBe(0);
  });

  it("reflects the user's current streak", async () => {
    const user = await createTestUser({
      timezone: TZ,
      streakCurrent: 7,
      streakMax: 10,
    });
    const review = await getWeeklyReview(user.id, TZ);
    expect(review.streakCurrent).toBe(7);
    expect(review.streakMax).toBe(10);
  });

  it("calculates top topics from completed tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Work" });
    const t1 = await createTestTask(user.id, { topicId: topic.id });
    const t2 = await createTestTask(user.id, { topicId: topic.id });

    const now = new Date();
    await db.insert(taskCompletions).values([
      { taskId: t1.id, userId: user.id, completedAt: now },
      { taskId: t2.id, userId: user.id, completedAt: now },
    ]);

    const review = await getWeeklyReview(user.id, TZ);
    expect(review.topTopics.length).toBeGreaterThan(0);
    expect(review.topTopics[0].title).toBe("Work");
    expect(review.topTopics[0].completions).toBe(2);
  });

  it("isolates data by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const task = await createTestTask(userA.id, { title: "A task" });

    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: userA.id,
      completedAt: new Date(),
    });

    const review = await getWeeklyReview(userB.id, TZ);
    expect(review.completionsThisWeek).toBe(0);
  });
});
