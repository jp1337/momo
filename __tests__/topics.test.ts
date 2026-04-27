/**
 * Integration tests for lib/topics.ts.
 *
 * Covers: getUserTopics (counts), getTopicById, createTopic, updateTopic,
 * deleteTopic (task reassignment to null on delete), archiveTopic,
 * unarchiveTopic, getArchivedTopics.
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
  archiveTopic,
  unarchiveTopic,
  getArchivedTopics,
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
    // TopicWithCounts includes taskCount
    expect(found!.taskCount).toBeGreaterThanOrEqual(2);
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
      priority: "NORMAL",
      sequential: false,
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
      priority: "NORMAL",
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
      priority: "NORMAL",
      sequential: false,
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

  it("updates the topic description", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Topic" });

    const updated = await updateTopic(topic.id, user.id, { description: "New desc" });
    expect(updated.description).toBe("New desc");
  });

  it("updates defaultEnergyLevel", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);

    const updated = await updateTopic(topic.id, user.id, { defaultEnergyLevel: "LOW" });
    expect(updated.defaultEnergyLevel).toBe("LOW");
  });

  it("updates archived flag directly via updateTopic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id);

    const archived = await updateTopic(topic.id, user.id, { archived: true });
    expect(archived.archived).toBe(true);

    const unarchived = await updateTopic(topic.id, user.id, { archived: false });
    expect(unarchived.archived).toBe(false);
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

// ─── archiveTopic ─────────────────────────────────────────────────────────────

describe("archiveTopic", () => {
  it("sets archived: true on the topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "To Archive" });

    const result = await archiveTopic(topic.id, user.id);
    expect(result.archived).toBe(true);
  });

  it("archived topic no longer appears in getUserTopics", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Will Disappear" });

    await archiveTopic(topic.id, user.id);

    const active = await getUserTopics(user.id);
    expect(active.find((t) => t.id === topic.id)).toBeUndefined();
  });

  it("throws when topic belongs to another user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(owner.id, { title: "Protected" });

    await expect(archiveTopic(topic.id, other.id)).rejects.toThrow(
      "Topic not found or access denied"
    );
  });
});

// ─── unarchiveTopic ───────────────────────────────────────────────────────────

describe("unarchiveTopic", () => {
  it("clears archived flag (sets to false)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Was Archived" });
    await archiveTopic(topic.id, user.id);

    const result = await unarchiveTopic(topic.id, user.id);
    expect(result.archived).toBe(false);
  });

  it("unarchived topic reappears in getUserTopics", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Restored" });
    await archiveTopic(topic.id, user.id);
    await unarchiveTopic(topic.id, user.id);

    const active = await getUserTopics(user.id);
    expect(active.find((t) => t.id === topic.id)).toBeDefined();
  });

  it("throws when topic belongs to another user", async () => {
    const owner = await createTestUser({ timezone: TZ });
    const other = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(owner.id, { title: "Mine" });
    await archiveTopic(topic.id, owner.id);

    await expect(unarchiveTopic(topic.id, other.id)).rejects.toThrow(
      "Topic not found or access denied"
    );
  });
});

// ─── getArchivedTopics ────────────────────────────────────────────────────────

describe("getArchivedTopics", () => {
  it("returns only archived topics", async () => {
    const user = await createTestUser({ timezone: TZ });
    const active = await createTestTopic(user.id, { title: "Active" });
    const archived = await createTestTopic(user.id, { title: "Archived" });
    await archiveTopic(archived.id, user.id);

    const result = await getArchivedTopics(user.id);
    expect(result.find((t) => t.id === archived.id)).toBeDefined();
    expect(result.find((t) => t.id === active.id)).toBeUndefined();
  });

  it("returns empty array when no topics are archived", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTopic(user.id, { title: "Active Only" });

    const result = await getArchivedTopics(user.id);
    expect(result).toHaveLength(0);
  });

  it("includes taskCount and completedCount for each archived topic", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "With Tasks" });
    await createTestTask(user.id, { topicId: topic.id, title: "Open" });
    await createTestTask(user.id, {
      topicId: topic.id,
      title: "Done",
      completedAt: new Date(),
    });
    await archiveTopic(topic.id, user.id);

    const result = await getArchivedTopics(user.id);
    const found = result.find((t) => t.id === topic.id);
    expect(found).toBeDefined();
    expect(found!.taskCount).toBe(2);
    expect(found!.completedCount).toBe(1);
  });

  it("isolates archived topics by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const topicA = await createTestTopic(userA.id, { title: "A's Archive" });
    await archiveTopic(topicA.id, userA.id);

    const result = await getArchivedTopics(userB.id);
    expect(result).toHaveLength(0);
  });
});
