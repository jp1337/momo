/**
 * Integration tests for lib/daily-quest.ts mutations:
 *   postponeDailyQuest, forceSelectDailyQuest, reselectQuestForEnergy, pinTaskAsDailyQuest
 *
 * Every test runs against a real momo_test PostgreSQL database (no mocks).
 * The DB is reset to a clean state before each test by setup.ts.
 */

import { describe, it, expect } from "vitest";
import {
  postponeDailyQuest,
  forceSelectDailyQuest,
  reselectQuestForEnergy,
  pinTaskAsDailyQuest,
} from "@/lib/daily-quest";
import { db } from "@/lib/db";
import { users, tasks, topics, questPostponements } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import {
  getLocalDateString,
  getLocalTomorrowString,
} from "@/lib/date-utils";
import {
  createTestUser,
  createTestTask,
} from "./helpers/fixtures";

const TZ = "Europe/Berlin";

async function getTask(taskId: string) {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  return row;
}

async function getUser(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  return row;
}

async function postponementCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(questPostponements)
    .where(eq(questPostponements.userId, userId));
  return Number(row?.count ?? 0);
}

// ─── postponeDailyQuest ───────────────────────────────────────────────────────

describe("postponeDailyQuest", () => {
  it("clears isDailyQuest and sets snoozedUntil to tomorrow", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const tomorrow = getLocalTomorrowString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
    });

    await postponeDailyQuest(task.id, user.id, TZ);

    const updated = await getTask(task.id);
    expect(updated.isDailyQuest).toBe(false);
    expect(updated.snoozedUntil).toBe(tomorrow);
    expect(updated.dueDate).toBe(tomorrow);
  });

  it("increments the task's postponeCount", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
      postponeCount: 1,
    });

    await postponeDailyQuest(task.id, user.id, TZ);

    const updated = await getTask(task.id);
    expect(updated.postponeCount).toBe(2);
  });

  it("inserts a questPostponements row", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
    });

    expect(await postponementCount(user.id)).toBe(0);

    await postponeDailyQuest(task.id, user.id, TZ);

    expect(await postponementCount(user.id)).toBe(1);
  });

  it("increments questPostponesToday on the user and sets questPostponedDate to today", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
    });

    const result = await postponeDailyQuest(task.id, user.id, TZ);

    expect(result.postponesToday).toBe(1);
    expect(result.postponeLimit).toBeGreaterThan(0);

    const updated = await getUser(user.id);
    expect(updated.questPostponesToday).toBe(1);
    expect(updated.questPostponedDate).toBe(today);
  });

  it("resets daily counter when questPostponedDate is a different day", async () => {
    // Simulate: user had postponements "yesterday" (counter should reset)
    const [user] = await db
      .insert(users)
      .values({
        name: "Test User",
        email: `test-${Date.now()}@example.com`,
        timezone: TZ,
        questPostponesToday: 2,
        questPostponedDate: "2000-01-01", // old date
        questPostponeLimit: 3,
      })
      .returning();

    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
    });

    const result = await postponeDailyQuest(task.id, user.id, TZ);

    // Counter resets to 0 then increments to 1
    expect(result.postponesToday).toBe(1);
  });

  it("throws LIMIT_REACHED when the daily limit is exhausted", async () => {
    const [user] = await db
      .insert(users)
      .values({
        name: "Test User",
        email: `test-${Date.now()}@example.com`,
        timezone: TZ,
        questPostponesToday: 3,
        questPostponedDate: getLocalDateString(TZ),
        questPostponeLimit: 3,
      })
      .returning();

    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
    });

    await expect(postponeDailyQuest(task.id, user.id, TZ)).rejects.toThrow(
      "LIMIT_REACHED"
    );
  });

  it("throws when the task is not the active daily quest", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { isDailyQuest: false });

    await expect(postponeDailyQuest(task.id, user.id, TZ)).rejects.toThrow();
  });
});

// ─── forceSelectDailyQuest ────────────────────────────────────────────────────

describe("forceSelectDailyQuest", () => {
  it("returns null when the user has no eligible tasks", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await forceSelectDailyQuest(user.id, TZ);

    expect(result).toBeNull();
  });

  it("assigns a task as daily quest when eligible tasks exist", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Do the thing" });

    const result = await forceSelectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(task.id);
    const updated = await getTask(task.id);
    expect(updated.isDailyQuest).toBe(true);
    expect(updated.dailyQuestDate).toBe(getLocalDateString(TZ));
  });

  it("clears the existing daily quest before selecting a new one", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    // Tier 2 (HIGH priority) requires the task to belong to a topic.
    // Create a topic so the HIGH priority task qualifies for tier 2.
    const [topic] = await db
      .insert(topics)
      .values({ userId: user.id, title: "Work", icon: "faFolder", color: "#000" })
      .returning();

    const oldQuest = await createTestTask(user.id, {
      title: "Old quest",
      isDailyQuest: true,
      dailyQuestDate: today,
    });
    const newTask = await createTestTask(user.id, {
      title: "New candidate",
      priority: "HIGH",
      topicId: topic.id,
    });

    const result = await forceSelectDailyQuest(user.id, TZ);

    expect(result).not.toBeNull();

    const old = await getTask(oldQuest.id);
    // The old quest must no longer be active (unless it was re-selected)
    if (result!.id !== oldQuest.id) {
      expect(old.isDailyQuest).toBe(false);
    }

    // Exactly one task should be the daily quest
    const [{ questCount }] = await db
      .select({ questCount: count() })
      .from(tasks)
      .where(eq(tasks.isDailyQuest, true));
    expect(Number(questCount)).toBe(1);

    // The new HIGH priority task (in a topic) should be preferred via tier 2
    expect(result!.id).toBe(newTask.id);
  });

  it("prefers energy-matching tasks when energyLevel is provided", async () => {
    const user = await createTestUser({ timezone: TZ });
    const lowEnergyTask = await createTestTask(user.id, {
      title: "Low energy task",
      energyLevel: "LOW",
    });
    await createTestTask(user.id, {
      title: "High energy task",
      energyLevel: "HIGH",
    });

    const result = await forceSelectDailyQuest(user.id, TZ, "LOW");

    expect(result).not.toBeNull();
    expect(result!.id).toBe(lowEnergyTask.id);
  });
});

// ─── reselectQuestForEnergy ───────────────────────────────────────────────────

describe("reselectQuestForEnergy", () => {
  it("returns swapped: false when there is no active quest", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await reselectQuestForEnergy(user.id, "LOW", TZ);

    expect(result.swapped).toBe(false);
  });

  it("returns swapped: false when quest is already completed", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    // The completed task has isDailyQuest = true but completedAt is set.
    // getCurrentDailyQuest filters by completedAt IS NULL, so it won't find this task.
    // reselectQuestForEnergy falls into case (1) — no active quest — and tries to
    // select a fresh quest. With no other eligible task, it returns null quest.
    await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
      completedAt: new Date(),
      energyLevel: "HIGH",
    });

    const result = await reselectQuestForEnergy(user.id, "LOW", TZ);

    expect(result.swapped).toBe(false);
  });

  it("returns swapped: false when quest has no energy tag (untagged is universal)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
      energyLevel: null,
    });

    const result = await reselectQuestForEnergy(user.id, "HIGH", TZ);

    expect(result.swapped).toBe(false);
  });

  it("returns swapped: false when quest already matches the energy level", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
      energyLevel: "LOW",
    });

    const result = await reselectQuestForEnergy(user.id, "LOW", TZ);

    expect(result.swapped).toBe(false);
    expect(result.quest?.id).toBe(task.id);
  });

  it("swaps quest when energy mismatches and a better candidate exists", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const currentQuest = await createTestTask(user.id, {
      title: "High energy quest",
      isDailyQuest: true,
      dailyQuestDate: today,
      energyLevel: "HIGH",
    });
    const betterMatch = await createTestTask(user.id, {
      title: "Low energy task",
      energyLevel: "LOW",
    });

    const result = await reselectQuestForEnergy(user.id, "LOW", TZ);

    expect(result.swapped).toBe(true);
    expect(result.quest?.id).toBe(betterMatch.id);
    expect(result.previousQuestId).toBe(currentQuest.id);
    expect(result.previousQuestTitle).toBe(currentQuest.title);

    const old = await getTask(currentQuest.id);
    expect(old.isDailyQuest).toBe(false);

    const updated = await getTask(betterMatch.id);
    expect(updated.isDailyQuest).toBe(true);
  });

  it("keeps current quest when energy mismatches but no better candidate exists", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const currentQuest = await createTestTask(user.id, {
      title: "Only task",
      isDailyQuest: true,
      dailyQuestDate: today,
      energyLevel: "HIGH",
    });

    // No other tasks exist — no better candidate possible
    const result = await reselectQuestForEnergy(user.id, "LOW", TZ);

    expect(result.swapped).toBe(false);
    expect(result.quest?.id).toBe(currentQuest.id);
  });
});

// ─── pinTaskAsDailyQuest ──────────────────────────────────────────────────────

describe("pinTaskAsDailyQuest", () => {
  it("sets the task as daily quest and clears any existing quest", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const oldQuest = await createTestTask(user.id, {
      title: "Old quest",
      isDailyQuest: true,
      dailyQuestDate: today,
    });
    const newTarget = await createTestTask(user.id, { title: "New quest" });

    const result = await pinTaskAsDailyQuest(user.id, newTarget.id, TZ);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(newTarget.id);

    const old = await getTask(oldQuest.id);
    expect(old.isDailyQuest).toBe(false);

    const updated = await getTask(newTarget.id);
    expect(updated.isDailyQuest).toBe(true);
    expect(updated.dailyQuestDate).toBe(today);
  });

  it("returns null when the task does not belong to the user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const task = await createTestTask(owner.id);

    const result = await pinTaskAsDailyQuest(other.id, task.id, TZ);

    expect(result).toBeNull();
  });

  it("returns null when the task is already completed", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { completedAt: new Date() });

    const result = await pinTaskAsDailyQuest(user.id, task.id, TZ);

    expect(result).toBeNull();
  });

  it("returns null when the task is snoozed past today", async () => {
    const user = await createTestUser({ timezone: TZ });
    const tomorrow = getLocalTomorrowString(TZ);
    const task = await createTestTask(user.id, { snoozedUntil: tomorrow });

    const result = await pinTaskAsDailyQuest(user.id, task.id, TZ);

    expect(result).toBeNull();
  });

  it("pins a task that is snoozed until today (not past today)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, { snoozedUntil: today });

    const result = await pinTaskAsDailyQuest(user.id, task.id, TZ);

    // today <= today, so not snoozed past today — should succeed
    expect(result).not.toBeNull();
    expect(result!.id).toBe(task.id);
  });
});
