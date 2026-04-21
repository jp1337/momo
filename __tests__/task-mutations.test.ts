/**
 * Integration tests for lib/tasks.ts mutations:
 *   uncompleteTask, snoozeTask, unsnoozeTask, bulkUpdateTasks,
 *   reorderTasks, promoteTaskToTopic, breakdownTask
 *
 * Also covers WEEKDAY/MONTHLY/YEARLY recurrence via completeTask.
 *
 * Every test runs against a real momo_test PostgreSQL database (no mocks).
 * The DB is reset to a clean state before each test by setup.ts.
 */

import { describe, it, expect } from "vitest";
import {
  completeTask,
  uncompleteTask,
  snoozeTask,
  unsnoozeTask,
  bulkUpdateTasks,
  reorderTasks,
  promoteTaskToTopic,
  breakdownTask,
} from "@/lib/tasks";
import { db } from "@/lib/db";
import { users, tasks, taskCompletions, topics } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import {
  getLocalDateString,
  getLocalTomorrowString,
} from "@/lib/date-utils";
import {
  createTestUser,
  createTestTask,
  createTestTopic,
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

async function completionCount(taskId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(taskCompletions)
    .where(eq(taskCompletions.taskId, taskId));
  return Number(row?.count ?? 0);
}

// ─── uncompleteTask ───────────────────────────────────────────────────────────

describe("uncompleteTask", () => {
  it("clears completedAt and removes the most recent taskCompletions entry", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 0 });
    const task = await createTestTask(user.id, { coinValue: 2 });
    await completeTask(task.id, user.id, TZ);

    expect(await completionCount(task.id)).toBe(1);

    await uncompleteTask(task.id, user.id);

    const updated = await getTask(task.id);
    expect(updated.completedAt).toBeNull();
    expect(await completionCount(task.id)).toBe(0);
  });

  it("subtracts coins equal to coinValue (without going negative)", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 0 });
    const task = await createTestTask(user.id, { coinValue: 5 });
    await completeTask(task.id, user.id, TZ);

    const afterComplete = await getUser(user.id);
    const coinsAfterComplete = afterComplete.coins;

    await uncompleteTask(task.id, user.id);

    const afterUncomplete = await getUser(user.id);
    expect(afterUncomplete.coins).toBe(Math.max(0, coinsAfterComplete - 5));
  });

  it("never sets coins below zero", async () => {
    // User with 0 coins tries to uncomplete — GREATEST clamp prevents negative.
    // taskCompletions has no coinsEarned column, so just insert the row.
    const user = await createTestUser({ timezone: TZ, coins: 0 });
    const task = await createTestTask(user.id, { completedAt: new Date(), coinValue: 100 });

    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
    });

    await uncompleteTask(task.id, user.id);

    const updated = await getUser(user.id);
    expect(updated.coins).toBeGreaterThanOrEqual(0);
  });

  it("throws when trying to uncomplete a RECURRING task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestRecurringTask(user.id);

    await expect(uncompleteTask(task.id, user.id)).rejects.toThrow(
      "Recurring tasks cannot be uncompleted"
    );
  });

  it("throws when the task is not completed", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id); // completedAt = null

    await expect(uncompleteTask(task.id, user.id)).rejects.toThrow(
      "Task is not completed"
    );
  });
});

// ─── snoozeTask ───────────────────────────────────────────────────────────────

describe("snoozeTask", () => {
  it("sets snoozedUntil on the task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id);
    const tomorrow = getLocalTomorrowString(TZ);

    await snoozeTask(task.id, user.id, tomorrow);

    const updated = await getTask(task.id);
    expect(updated.snoozedUntil).toBe(tomorrow);
  });

  it("clears isDailyQuest when the task is the active daily quest", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      isDailyQuest: true,
      dailyQuestDate: today,
    });
    const tomorrow = getLocalTomorrowString(TZ);

    await snoozeTask(task.id, user.id, tomorrow);

    const updated = await getTask(task.id);
    expect(updated.isDailyQuest).toBe(false);
    expect(updated.snoozedUntil).toBe(tomorrow);
  });

  it("does not change isDailyQuest when the task is not the daily quest", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { isDailyQuest: false });
    const tomorrow = getLocalTomorrowString(TZ);

    await snoozeTask(task.id, user.id, tomorrow);

    const updated = await getTask(task.id);
    expect(updated.isDailyQuest).toBe(false);
  });

  it("throws when the task is already completed", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { completedAt: new Date() });
    const tomorrow = getLocalTomorrowString(TZ);

    await expect(snoozeTask(task.id, user.id, tomorrow)).rejects.toThrow(
      "Cannot snooze a completed task"
    );
  });

  it("throws when the task does not belong to the user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const task = await createTestTask(owner.id);
    const tomorrow = getLocalTomorrowString(TZ);

    await expect(snoozeTask(task.id, other.id, tomorrow)).rejects.toThrow(
      "Task not found or access denied"
    );
  });
});

// ─── unsnoozeTask ─────────────────────────────────────────────────────────────

describe("unsnoozeTask", () => {
  it("clears snoozedUntil", async () => {
    const user = await createTestUser({ timezone: TZ });
    const tomorrow = getLocalTomorrowString(TZ);
    const task = await createTestTask(user.id, { snoozedUntil: tomorrow });

    await unsnoozeTask(task.id, user.id);

    const updated = await getTask(task.id);
    expect(updated.snoozedUntil).toBeNull();
  });

  it("throws when the task does not belong to the user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const task = await createTestTask(owner.id);

    await expect(unsnoozeTask(task.id, other.id)).rejects.toThrow(
      "Task not found or access denied"
    );
  });
});

// ─── bulkUpdateTasks ──────────────────────────────────────────────────────────

describe("bulkUpdateTasks", () => {
  it("deletes all specified tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const t1 = await createTestTask(user.id);
    const t2 = await createTestTask(user.id);
    const t3 = await createTestTask(user.id);

    const result = await bulkUpdateTasks(user.id, {
      action: "delete",
      taskIds: [t1.id, t2.id],
    });

    expect(result.affected).toBe(2);
    expect(await getTask(t1.id)).toBeUndefined();
    expect(await getTask(t2.id)).toBeUndefined();
    expect(await getTask(t3.id)).toBeDefined();
  });

  it("bulk-completes non-recurring, non-completed tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const t1 = await createTestTask(user.id);
    const t2 = await createTestTask(user.id);
    const recurring = await createTestRecurringTask(user.id);

    const result = await bulkUpdateTasks(user.id, {
      action: "complete",
      taskIds: [t1.id, t2.id, recurring.id],
    });

    // Recurring is excluded from bulk-complete
    expect(result.affected).toBe(2);
    const u1 = await getTask(t1.id);
    const u2 = await getTask(t2.id);
    const ur = await getTask(recurring.id);
    expect(u1.completedAt).not.toBeNull();
    expect(u2.completedAt).not.toBeNull();
    expect(ur.completedAt).toBeNull(); // recurring skipped
  });

  it("skips already-completed tasks during bulk-complete", async () => {
    const user = await createTestUser({ timezone: TZ });
    const already = await createTestTask(user.id, { completedAt: new Date() });
    const fresh = await createTestTask(user.id);

    const result = await bulkUpdateTasks(user.id, {
      action: "complete",
      taskIds: [already.id, fresh.id],
    });

    expect(result.affected).toBe(1);
  });

  it("moves tasks to a different topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    const t1 = await createTestTask(user.id);
    const t2 = await createTestTask(user.id);

    const result = await bulkUpdateTasks(user.id, {
      action: "changeTopic",
      taskIds: [t1.id, t2.id],
      topicId: topic.id,
    });

    expect(result.affected).toBe(2);
    expect((await getTask(t1.id)).topicId).toBe(topic.id);
    expect((await getTask(t2.id)).topicId).toBe(topic.id);
  });

  it("removes tasks from their topic when topicId is null", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    const task = await createTestTask(user.id, { topicId: topic.id });

    await bulkUpdateTasks(user.id, {
      action: "changeTopic",
      taskIds: [task.id],
      topicId: null,
    });

    expect((await getTask(task.id)).topicId).toBeNull();
  });

  it("sets priority on all specified tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const t1 = await createTestTask(user.id, { priority: "NORMAL" });
    const t2 = await createTestTask(user.id, { priority: "NORMAL" });

    await bulkUpdateTasks(user.id, {
      action: "setPriority",
      taskIds: [t1.id, t2.id],
      priority: "HIGH",
    });

    expect((await getTask(t1.id)).priority).toBe("HIGH");
    expect((await getTask(t2.id)).priority).toBe("HIGH");
  });

  it("does not affect tasks belonging to a different user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const task = await createTestTask(owner.id);

    const result = await bulkUpdateTasks(other.id, {
      action: "delete",
      taskIds: [task.id],
    });

    expect(result.affected).toBe(0);
    expect(await getTask(task.id)).toBeDefined();
  });
});

// ─── reorderTasks ─────────────────────────────────────────────────────────────

describe("reorderTasks", () => {
  it("updates sortOrder to match the provided array index", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    const t1 = await createTestTask(user.id, { topicId: topic.id, sortOrder: 0 });
    const t2 = await createTestTask(user.id, { topicId: topic.id, sortOrder: 1 });
    const t3 = await createTestTask(user.id, { topicId: topic.id, sortOrder: 2 });

    // Reverse the order
    await reorderTasks(topic.id, user.id, [t3.id, t1.id, t2.id]);

    expect((await getTask(t3.id)).sortOrder).toBe(0);
    expect((await getTask(t1.id)).sortOrder).toBe(1);
    expect((await getTask(t2.id)).sortOrder).toBe(2);
  });

  it("throws when a task id does not belong to the topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    const taskInTopic = await createTestTask(user.id, { topicId: topic.id });
    const foreignTask = await createTestTask(user.id); // no topicId

    await expect(
      reorderTasks(topic.id, user.id, [taskInTopic.id, foreignTask.id])
    ).rejects.toThrow();
  });
});

// ─── promoteTaskToTopic ───────────────────────────────────────────────────────

describe("promoteTaskToTopic", () => {
  it("creates a new topic and moves the task into it", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, {
      title: "Big project",
      topicId: null,
    });

    const { topic, task: updatedTask } = await promoteTaskToTopic(task.id, user.id);

    expect(topic.title).toBe("Big project");
    expect(updatedTask.topicId).toBe(topic.id);

    const [topicRow] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topic.id));
    expect(topicRow).toBeDefined();
  });

  it("throws when the task already belongs to a topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    const task = await createTestTask(user.id, { topicId: topic.id });

    await expect(promoteTaskToTopic(task.id, user.id)).rejects.toThrow(
      "Task already belongs to a topic"
    );
  });

  it("throws when the task does not belong to the user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const task = await createTestTask(owner.id);

    await expect(promoteTaskToTopic(task.id, other.id)).rejects.toThrow(
      "Task not found or access denied"
    );
  });
});

// ─── breakdownTask ────────────────────────────────────────────────────────────

describe("breakdownTask", () => {
  it("creates a topic and N subtasks, then deletes the original", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Master plan" });

    const result = await breakdownTask(task.id, user.id, ["Step A", "Step B", "Step C"]);

    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].title).toBe("Step A");
    expect(result.tasks[1].title).toBe("Step B");
    expect(result.tasks[2].title).toBe("Step C");

    // sortOrder is sequential from 0
    expect(result.tasks[0].sortOrder).toBe(0);
    expect(result.tasks[1].sortOrder).toBe(1);
    expect(result.tasks[2].sortOrder).toBe(2);

    // All subtasks belong to the new topic
    const topicId = result.topicId;
    result.tasks.forEach((t) => expect(t.topicId).toBe(topicId));

    // Original task is deleted
    expect(await getTask(task.id)).toBeUndefined();
  });

  it("increments totalTasksCreated by the number of subtasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id);
    await db
      .update(users)
      .set({ totalTasksCreated: 1 })
      .where(eq(users.id, user.id));

    await breakdownTask(task.id, user.id, ["A", "B"]);

    const updated = await getUser(user.id);
    // 1 existing + 2 new subtasks = 3
    expect(updated.totalTasksCreated).toBe(3);
  });

  it("throws when the task does not belong to the user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const task = await createTestTask(owner.id);

    await expect(
      breakdownTask(task.id, other.id, ["Sub 1", "Sub 2"])
    ).rejects.toThrow("Task not found or access denied");
  });
});

// ─── Recurrence type tests (via completeTask) ─────────────────────────────────

describe("completeTask — recurrence type next-due-date logic", () => {
  it("WEEKDAY: advances nextDueDate to the same weekday next week", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    // recurrenceWeekdays is stored as a JSON array string e.g. "[1]"
    // Convert JS day (0=Sun..6=Sat) to ISO weekday (0=Mon..6=Sun)
    const jsDayOfWeek = new Date(today + "T12:00:00Z").getUTCDay();
    const isoDayOfWeek = (jsDayOfWeek + 6) % 7;
    const task = await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "WEEKDAY",
      nextDueDate: today,
      recurrenceWeekdays: JSON.stringify([isoDayOfWeek]),
    });

    await completeTask(task.id, user.id, TZ);

    const updated = await getTask(task.id);
    expect(updated.completedAt).toBeNull();
    expect(updated.nextDueDate).not.toBe(today);

    // Next occurrence should be 7 days from today (same weekday)
    const [y, m, d] = today.split("-").map(Number);
    const expected = new Date(Date.UTC(y, m - 1, d + 7)).toISOString().split("T")[0];
    expect(updated.nextDueDate).toBe(expected);
  });

  it("MONTHLY: advances nextDueDate by one month (recurrenceFixed = true)", async () => {
    const user = await createTestUser({ timezone: TZ });
    // recurrenceFixed = true → uses nextDueDate as base (not today)
    const task = await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "MONTHLY",
      nextDueDate: "2025-01-15",
      recurrenceInterval: 1,
      recurrenceFixed: true,
    });

    await completeTask(task.id, user.id, TZ);

    const updated = await getTask(task.id);
    expect(updated.nextDueDate).toBe("2025-02-15");
  });

  it("MONTHLY: clamps Jan 31 to Feb 28 in non-leap year (recurrenceFixed = true)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "MONTHLY",
      nextDueDate: "2025-01-31", // 2025 is not a leap year
      recurrenceInterval: 1,
      recurrenceFixed: true,
    });

    await completeTask(task.id, user.id, TZ);

    const updated = await getTask(task.id);
    expect(updated.nextDueDate).toBe("2025-02-28");
  });

  it("YEARLY: advances nextDueDate by one year (recurrenceFixed = true)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "YEARLY",
      nextDueDate: "2024-06-15",
      recurrenceInterval: 1,
      recurrenceFixed: true,
    });

    await completeTask(task.id, user.id, TZ);

    const updated = await getTask(task.id);
    expect(updated.nextDueDate).toBe("2025-06-15");
  });
});
