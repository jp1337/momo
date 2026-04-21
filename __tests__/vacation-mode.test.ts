/**
 * Integration tests for lib/vacation.ts:
 *   getVacationStatus, activateVacationMode, deactivateVacationMode, autoEndVacations
 *
 * Every test runs against a real momo_test PostgreSQL database (no mocks).
 * The DB is reset to a clean state before each test by setup.ts.
 */

import { describe, it, expect } from "vitest";
import {
  getVacationStatus,
  activateVacationMode,
  deactivateVacationMode,
  autoEndVacations,
} from "@/lib/vacation";
import { db } from "@/lib/db";
import { users, tasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getLocalDateString,
  getLocalTomorrowString,
} from "@/lib/date-utils";
import {
  createTestUser,
  createTestTask,
  createTestRecurringTask,
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

// ─── getVacationStatus ────────────────────────────────────────────────────────

describe("getVacationStatus", () => {
  it("returns active: false when no vacation is set", async () => {
    const user = await createTestUser({ timezone: TZ });

    const status = await getVacationStatus(user.id);

    expect(status.active).toBe(false);
    expect(status.endDate).toBeNull();
  });

  it("returns active: true with the end date when vacation is active", async () => {
    const user = await createTestUser({ timezone: TZ });
    const endDate = getLocalTomorrowString(TZ);
    await activateVacationMode(user.id, endDate, TZ);

    const status = await getVacationStatus(user.id);

    expect(status.active).toBe(true);
    expect(status.endDate).toBe(endDate);
  });
});

// ─── activateVacationMode ─────────────────────────────────────────────────────

describe("activateVacationMode", () => {
  it("sets vacationEndDate on the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    const endDate = getLocalTomorrowString(TZ);

    await activateVacationMode(user.id, endDate, TZ);

    const updated = await getUser(user.id);
    expect(updated.vacationEndDate).toBe(endDate);
  });

  it("pauses all active RECURRING tasks (sets pausedAt and pausedUntil)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const endDate = getLocalTomorrowString(TZ);
    const recurring = await createTestRecurringTask(user.id);

    await activateVacationMode(user.id, endDate, TZ);

    const updated = await getTask(recurring.id);
    expect(updated.pausedAt).toBe(today);
    expect(updated.pausedUntil).toBe(endDate);
  });

  it("clears isDailyQuest on the paused task if it was the active quest", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const endDate = getLocalTomorrowString(TZ);
    const questTask = await createTestRecurringTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
    });

    await activateVacationMode(user.id, endDate, TZ);

    const updated = await getTask(questTask.id);
    expect(updated.isDailyQuest).toBe(false);
  });

  it("does NOT pause ONE_TIME tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const endDate = getLocalTomorrowString(TZ);
    const oneTime = await createTestTask(user.id, { type: "ONE_TIME" });

    await activateVacationMode(user.id, endDate, TZ);

    const updated = await getTask(oneTime.id);
    expect(updated.pausedAt).toBeNull();
    expect(updated.pausedUntil).toBeNull();
  });

  it("does NOT pause already-completed recurring tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const endDate = getLocalTomorrowString(TZ);
    const completed = await createTestRecurringTask(user.id, {
      completedAt: new Date(),
    });

    await activateVacationMode(user.id, endDate, TZ);

    const updated = await getTask(completed.id);
    expect(updated.pausedAt).toBeNull();
  });
});

// ─── deactivateVacationMode ───────────────────────────────────────────────────

describe("deactivateVacationMode", () => {
  it("clears vacationEndDate on the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    const endDate = getLocalTomorrowString(TZ);
    await activateVacationMode(user.id, endDate, TZ);

    await deactivateVacationMode(user.id, TZ);

    const updated = await getUser(user.id);
    expect(updated.vacationEndDate).toBeNull();
  });

  it("clears pausedAt and pausedUntil on recurring tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const endDate = getLocalTomorrowString(TZ);
    const recurring = await createTestRecurringTask(user.id);
    await activateVacationMode(user.id, endDate, TZ);

    await deactivateVacationMode(user.id, TZ);

    const updated = await getTask(recurring.id);
    expect(updated.pausedAt).toBeNull();
    expect(updated.pausedUntil).toBeNull();
  });

  it("shifts nextDueDate forward by the number of paused days", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Manually create a task that was paused 3 days ago with nextDueDate = today
    const today = getLocalDateString(TZ);
    const [y, m, d] = today.split("-").map(Number);
    const threeDaysAgo = new Date(Date.UTC(y, m - 1, d - 3)).toISOString().split("T")[0];
    const expectedNewDue = new Date(Date.UTC(y, m - 1, d + 3)).toISOString().split("T")[0];

    const recurring = await createTestRecurringTask(user.id, {
      pausedAt: threeDaysAgo,
      pausedUntil: today,
      nextDueDate: today,
    });

    await deactivateVacationMode(user.id, TZ);

    const updated = await getTask(recurring.id);
    // nextDueDate should be shifted forward by 3 days
    expect(updated.nextDueDate).toBe(expectedNewDue);
  });

  it("never sets nextDueDate to a past date (uses today as minimum)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const [y, m, d] = today.split("-").map(Number);
    const thirtyDaysAgo = new Date(Date.UTC(y, m - 1, d - 30)).toISOString().split("T")[0];
    const alsoThirtyDaysAgo = new Date(Date.UTC(y, m - 1, d - 30)).toISOString().split("T")[0];

    // Task with nextDueDate = 30 days ago and paused for 0 days (edge case)
    const recurring = await createTestRecurringTask(user.id, {
      pausedAt: thirtyDaysAgo,
      pausedUntil: alsoThirtyDaysAgo,
      nextDueDate: thirtyDaysAgo,
    });

    await deactivateVacationMode(user.id, TZ);

    const updated = await getTask(recurring.id);
    // Result should be >= today, never in the past
    if (updated.nextDueDate) {
      expect(updated.nextDueDate >= today).toBe(true);
    }
  });
});

// ─── autoEndVacations ─────────────────────────────────────────────────────────

describe("autoEndVacations", () => {
  it("ends vacation for users whose vacationEndDate has passed", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Artificially set vacationEndDate to yesterday
    const today = getLocalDateString(TZ);
    const [y, m, d] = today.split("-").map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().split("T")[0];

    await db
      .update(users)
      .set({ vacationEndDate: yesterday })
      .where(eq(users.id, user.id));

    await autoEndVacations();

    const updated = await getUser(user.id);
    expect(updated.vacationEndDate).toBeNull();
  });

  it("does NOT end vacation for users whose end date is today or in the future", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    await db
      .update(users)
      .set({ vacationEndDate: today })
      .where(eq(users.id, user.id));

    await autoEndVacations();

    const updated = await getUser(user.id);
    // vacationEndDate === today (not strictly < today), so NOT ended
    expect(updated.vacationEndDate).toBe(today);
  });

  it("does not affect users with no active vacation", async () => {
    const user = await createTestUser({ timezone: TZ });
    // No vacationEndDate set

    const result = await autoEndVacations();

    const updated = await getUser(user.id);
    expect(updated.vacationEndDate).toBeNull();
    expect(result.sent).toBe(0);
  });
});
