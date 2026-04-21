/**
 * Integration tests for lib/topics.ts.
 *
 * Covers: getUserTopics (counts), getTopicById, createTopic, updateTopic,
 * deleteTopic (task reassignment to null on delete).
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { tasks } from "@/lib/db/schema";
import {
  getUserTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
} from "@/lib/topics";
import { createTestUser, createTestTopic, createTestTask } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── getUserTopics ────────────────────────────────────────────────────────────

describe("getUserTopics", () => {
  it("returns all topics for the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTopic(user.id, { title: "Work" });
    await createTestTopic(user.id, { title: "Home" });

    const result = await getUserTopics(user.id);
    expect(result).toHaveLength(2);
    const titles = result.map((t) => t.title);
    expect(titles).toContain("Work");
    expect(titles).toContain("Home");
  });

  it("isolates topics by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createTestTopic(userA.id, { title: "A's topic" });

    const resultB = await getUserTopics(userB.id);
    expect(resultB).toHaveLength(0);
  });

  it("returns empty array when user has no topics", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await getUserTopics(user.id);
    expect(result).toHaveLength(0);
  });

  it("includes task count in each topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "With Tasks" });
    await createTestTask(user.id, { topicId: topic.id });
    await createTestTask(user.id, { topicId: topic.id });

    const result = await getUserTopics(user.id);
    const found = result.find((t) => t.id === topic.id);
    expect(found).toBeDefined();
    // TopicWithCounts includes taskCount (open tasks)
    expect((found as Record<string, unknown>).taskCount).toBeGreaterThanOrEqual(2);
  });
});

// ─── getTopicById ─────────────────────────────────────────────────────────────

describe("getTopicById", () => {
  it("returns the topic with its tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Detailed" });
    await createTestTask(user.id, { topicId: topic.id, title: "Sub Task" });

    const result = await getTopicById(topic.id, user.id);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(topic.id);
    expect(result!.tasks).toBeDefined();
    expect(result!.tasks.some((t) => t.title === "Sub Task")).toBe(true);
  });

  it("returns null for a topic belonging to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(userA.id, { title: "Private" });

    const result = await getTopicById(topic.id, userB.id);
    expect(result).toBeNull();
  });

  it("returns null for a non-existent topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await getTopicById("00000000-0000-0000-0000-000000000000", user.id);
    expect(result).toBeNull();
  });
});

// ─── createTopic ──────────────────────────────────────────────────────────────

describe("createTopic", () => {
  it("creates a topic with the given title", async () => {
    const user = await createTestUser({ timezone: TZ });

    const topic = await createTopic(user.id, {
      title: "New Project",
      icon: "faFolder",
      color: "#4a7c59",
    });

    expect(topic.id).toBeDefined();
    expect(topic.title).toBe("New Project");
    expect(topic.userId).toBe(user.id);
  });

  it("creates a sequential topic", async () => {
    const user = await createTestUser({ timezone: TZ });

    const topic = await createTopic(user.id, {
      title: "Sequential",
      icon: "faLink",
      color: "#4a7c59",
      sequential: true,
    });

    expect(topic.sequential).toBe(true);
  });

  it("creates a topic with defaultEnergyLevel", async () => {
    const user = await createTestUser({ timezone: TZ });

    const topic = await createTopic(user.id, {
      title: "Sport",
      icon: "faDumbbell",
      color: "#ff6b6b",
      defaultEnergyLevel: "HIGH",
    });

    expect(topic.defaultEnergyLevel).toBe("HIGH");
  });
});

// ─── updateTopic ──────────────────────────────────────────────────────────────

describe("updateTopic", () => {
  it("updates the topic title", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Old Title" });

    const updated = await updateTopic(topic.id, user.id, { title: "New Title" });
    expect(updated.title).toBe("New Title");
  });

  it("updates sequential flag", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { sequential: false });

    const updated = await updateTopic(topic.id, user.id, { sequential: true });
    expect(updated.sequential).toBe(true);
  });

  it("throws when topic belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(userA.id, { title: "Protected" });

    await expect(
      updateTopic(topic.id, userB.id, { title: "Hacked" })
    ).rejects.toThrow();
  });
});

// ─── deleteTopic ──────────────────────────────────────────────────────────────

describe("deleteTopic", () => {
  it("deletes the topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "To Delete" });

    await deleteTopic(topic.id, user.id);

    const result = await getTopicById(topic.id, user.id);
    expect(result).toBeNull();
  });

  it("reassigns tasks to topicId=null when topic is deleted", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Delete Me" });
    const task = await createTestTask(user.id, { topicId: topic.id, title: "Orphaned" });

    await deleteTopic(topic.id, user.id);

    const [orphaned] = await db
      .select({ topicId: tasks.topicId })
      .from(tasks)
      .where(eq(tasks.id, task.id));
    expect(orphaned.topicId).toBeNull();
  });

  it("does not delete tasks when the topic is deleted", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Has Tasks" });
    const task = await createTestTask(user.id, { topicId: topic.id, title: "Survives" });

    await deleteTopic(topic.id, user.id);

    const [taskRow] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, task.id));
    expect(taskRow).toBeDefined();
  });

  it("throws when topic belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(userA.id, { title: "Protected" });

    await expect(deleteTopic(topic.id, userB.id)).rejects.toThrow();
  });
});
