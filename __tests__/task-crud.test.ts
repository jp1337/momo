/**
 * Integration tests for lib/tasks.ts — CRUD operations.
 *
 * Covers: getUserTasks (filters + isolation), getTaskById, createTask
 * (sortOrder, energy inheritance, totalTasksCreated), updateTask, deleteTask.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import {
  getUserTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/tasks";
import { createTestUser, createTestTopic, createTestTask } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── getUserTasks ─────────────────────────────────────────────────────────────

describe("getUserTasks", () => {
  it("returns all tasks for the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTask(user.id, { title: "Task A" });
    await createTestTask(user.id, { title: "Task B" });

    const result = await getUserTasks(user.id);
    expect(result).toHaveLength(2);
    const titles = result.map((t) => t.title);
    expect(titles).toContain("Task A");
    expect(titles).toContain("Task B");
  });

  it("isolates tasks by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createTestTask(userA.id, { title: "A's task" });
    await createTestTask(userB.id, { title: "B's task" });

    const resultA = await getUserTasks(userA.id);
    expect(resultA).toHaveLength(1);
    expect(resultA[0].title).toBe("A's task");
  });

  it("filters by topicId", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    await createTestTask(user.id, { title: "In Topic", topicId: topic.id });
    await createTestTask(user.id, { title: "No Topic" });

    const result = await getUserTasks(user.id, { topicId: topic.id });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("In Topic");
  });

  it("filters topicId=null returns tasks without a topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);
    await createTestTask(user.id, { title: "In Topic", topicId: topic.id });
    await createTestTask(user.id, { title: "No Topic" });

    const result = await getUserTasks(user.id, { topicId: null });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("No Topic");
  });

  it("filters by type", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTask(user.id, { title: "One Time", type: "ONE_TIME" });
    await createTestTask(user.id, {
      title: "Recurring",
      type: "RECURRING",
      nextDueDate: "2024-01-01",
    });

    const result = await getUserTasks(user.id, { type: "ONE_TIME" });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("One Time");
  });

  it("filters completed=false excludes done tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTask(user.id, { title: "Done", completedAt: new Date() });
    await createTestTask(user.id, { title: "Open" });

    const result = await getUserTasks(user.id, { completed: false });
    expect(result.every((t) => t.completedAt === null)).toBe(true);
    const titles = result.map((t) => t.title);
    expect(titles).not.toContain("Done");
  });

  it("returns empty array when user has no tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await getUserTasks(user.id);
    expect(result).toHaveLength(0);
  });
});

// ─── getTaskById ──────────────────────────────────────────────────────────────

describe("getTaskById", () => {
  it("returns the task when it belongs to the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Find Me" });

    const result = await getTaskById(task.id, user.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(task.id);
    expect(result!.title).toBe("Find Me");
  });

  it("returns null for a task belonging to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const task = await createTestTask(userA.id, { title: "Secret" });

    const result = await getTaskById(task.id, userB.id);
    expect(result).toBeNull();
  });

  it("returns null for a non-existent task ID", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await getTaskById("00000000-0000-0000-0000-000000000000", user.id);
    expect(result).toBeNull();
  });
});

// ─── createTask ───────────────────────────────────────────────────────────────

describe("createTask", () => {
  it("creates a basic ONE_TIME task", async () => {
    const user = await createTestUser({ timezone: TZ });

    const task = await createTask(user.id, {
      title: "Buy milk",
      type: "ONE_TIME",
      priority: "NORMAL",
      coinValue: 1,
    });

    expect(task.id).toBeDefined();
    expect(task.title).toBe("Buy milk");
    expect(task.type).toBe("ONE_TIME");
    expect(task.userId).toBe(user.id);
  });

  it("increments totalTasksCreated on the user", async () => {
    const user = await createTestUser({ timezone: TZ });

    await createTask(user.id, { title: "Task 1", type: "ONE_TIME", priority: "NORMAL", coinValue: 1 });
    await createTask(user.id, { title: "Task 2", type: "ONE_TIME", priority: "NORMAL", coinValue: 1 });

    const [row] = await db
      .select({ totalTasksCreated: users.totalTasksCreated })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row.totalTasksCreated).toBe(2);
  });

  it("assigns sequential sortOrder within a topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);

    const t1 = await createTask(user.id, {
      title: "First",
      type: "ONE_TIME",
      priority: "NORMAL",
      coinValue: 1,
      topicId: topic.id,
    });
    const t2 = await createTask(user.id, {
      title: "Second",
      type: "ONE_TIME",
      priority: "NORMAL",
      coinValue: 1,
      topicId: topic.id,
    });

    expect(t1.sortOrder).toBe(0);
    expect(t2.sortOrder).toBe(1);
  });

  it("inherits defaultEnergyLevel from topic when energyLevel is not set", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { defaultEnergyLevel: "HIGH" });

    const task = await createTask(user.id, {
      title: "Energy Inherit",
      type: "ONE_TIME",
      priority: "NORMAL",
      coinValue: 1,
      topicId: topic.id,
    });

    expect(task.energyLevel).toBe("HIGH");
  });

  it("explicit energyLevel overrides topic default", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { defaultEnergyLevel: "HIGH" });

    const task = await createTask(user.id, {
      title: "Override Energy",
      type: "ONE_TIME",
      priority: "NORMAL",
      coinValue: 1,
      topicId: topic.id,
      energyLevel: "LOW",
    });

    expect(task.energyLevel).toBe("LOW");
  });

  it("throws when topicId belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(userA.id);

    await expect(
      createTask(userB.id, {
        title: "Stolen topic",
        type: "ONE_TIME",
        priority: "NORMAL",
        coinValue: 1,
        topicId: topic.id,
      })
    ).rejects.toThrow("Topic not found or access denied");
  });

  it("sets nextDueDate for RECURRING tasks", async () => {
    const user = await createTestUser({ timezone: TZ });

    const task = await createTask(user.id, {
      title: "Daily habit",
      type: "RECURRING",
      priority: "NORMAL",
      coinValue: 1,
      recurrenceInterval: 1,
    });

    expect(task.nextDueDate).not.toBeNull();
  });
});

// ─── updateTask ───────────────────────────────────────────────────────────────

describe("updateTask", () => {
  it("updates task title", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Original" });

    const updated = await updateTask(task.id, user.id, { title: "Updated" });
    expect(updated.title).toBe("Updated");
  });

  it("updates task priority", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { priority: "NORMAL" });

    const updated = await updateTask(task.id, user.id, { priority: "HIGH" });
    expect(updated.priority).toBe("HIGH");
  });

  it("throws when task belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const task = await createTestTask(userA.id, { title: "Not yours" });

    await expect(
      updateTask(task.id, userB.id, { title: "Hacked" })
    ).rejects.toThrow();
  });
});

// ─── deleteTask ───────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  it("deletes the task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Delete Me" });

    await deleteTask(task.id, user.id);

    const remaining = await getUserTasks(user.id);
    expect(remaining.find((t) => t.id === task.id)).toBeUndefined();
  });

  it("throws when task belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const task = await createTestTask(userA.id, { title: "Protected" });

    await expect(deleteTask(task.id, userB.id)).rejects.toThrow();
  });

  it("does not delete other tasks belonging to the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    const t1 = await createTestTask(user.id, { title: "Keep" });
    const t2 = await createTestTask(user.id, { title: "Delete" });

    await deleteTask(t2.id, user.id);

    const remaining = await getUserTasks(user.id);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(t1.id);
  });

  it("cascade: deletes task completions with the task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "With Completion" });

    // Insert a completion manually
    await db.insert((await import("@/lib/db/schema")).taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: new Date(),
    });

    // Delete the task — should not throw FK violation
    await expect(deleteTask(task.id, user.id)).resolves.not.toThrow();
  });
});
