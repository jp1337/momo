/**
 * Topic business logic for Momo.
 * All topic-related database operations go through this module.
 * Every function filters by userId to ensure data isolation between users.
 *
 * @module lib/topics
 */

import { db } from "@/lib/db";
import { topics, tasks } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { CreateTopicInput, UpdateTopicInput } from "@/lib/validators";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A topic row as returned from the database */
export type Topic = typeof topics.$inferSelect;

/** A task row as returned from the database */
export type Task = typeof tasks.$inferSelect;

/** Topic with computed task count statistics */
export interface TopicWithCounts extends Topic {
  taskCount: number;
  completedCount: number;
}

/** Topic with its associated tasks */
export interface TopicWithTasks extends Topic {
  tasks: Task[];
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Retrieves all non-archived topics for a user, with task count statistics.
 * The counts include total tasks and completed tasks for each topic.
 *
 * @param userId - The authenticated user's UUID
 * @returns Array of topics with taskCount and completedCount fields
 */
export async function getUserTopics(
  userId: string
): Promise<TopicWithCounts[]> {
  // Fetch all topics for the user (non-archived)
  const topicRows = await db
    .select()
    .from(topics)
    .where(and(eq(topics.userId, userId), eq(topics.archived, false)));

  // Fetch all tasks for this user to count per-topic
  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId));

  // Aggregate task counts per topic in JS
  return topicRows.map((topic) => {
    const topicTasks = taskRows.filter((t) => t.topicId === topic.id);
    const completedCount = topicTasks.filter(
      (t) => t.completedAt !== null
    ).length;

    return {
      ...topic,
      taskCount: topicTasks.length,
      completedCount,
    };
  });
}

/**
 * Retrieves a single topic by ID with all associated tasks.
 * Scoped to the authenticated user.
 *
 * @param topicId - The topic's UUID
 * @param userId - The authenticated user's UUID
 * @returns The topic with its tasks array, or null if not found
 */
export async function getTopicById(
  topicId: string,
  userId: string
): Promise<TopicWithTasks | null> {
  const topicRows = await db
    .select()
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
    .limit(1);

  if (!topicRows[0]) {
    return null;
  }

  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.topicId, topicId), eq(tasks.userId, userId)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  return {
    ...topicRows[0],
    tasks: taskRows,
  };
}

/**
 * Creates a new topic for a user.
 *
 * @param userId - The authenticated user's UUID
 * @param input - Validated topic creation input
 * @returns The newly created topic
 */
export async function createTopic(
  userId: string,
  input: CreateTopicInput
): Promise<Topic> {
  const rows = await db
    .insert(topics)
    .values({
      userId,
      title: input.title,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      priority: input.priority ?? "NORMAL",
      defaultEnergyLevel: input.defaultEnergyLevel ?? null,
    })
    .returning();

  return rows[0];
}

/**
 * Updates an existing topic.
 * Only provided fields are updated (partial update).
 *
 * @param topicId - The topic's UUID
 * @param userId - The authenticated user's UUID (for ownership check)
 * @param input - Partial update input
 * @returns The updated topic
 * @throws Error if topic not found or not owned by user
 */
export async function updateTopic(
  topicId: string,
  userId: string,
  input: UpdateTopicInput
): Promise<Topic> {
  const updateValues: Partial<typeof topics.$inferInsert> = {};

  if (input.title !== undefined) updateValues.title = input.title;
  if (input.description !== undefined)
    updateValues.description = input.description;
  if (input.color !== undefined) updateValues.color = input.color;
  if (input.icon !== undefined) updateValues.icon = input.icon;
  if (input.priority !== undefined) updateValues.priority = input.priority;
  if (input.defaultEnergyLevel !== undefined)
    updateValues.defaultEnergyLevel = input.defaultEnergyLevel;

  const rows = await db
    .update(topics)
    .set(updateValues)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
    .returning();

  if (!rows[0]) {
    throw new Error("Topic not found or access denied");
  }

  return rows[0];
}

/**
 * Deletes a topic and reassigns its tasks to no topic (topicId = null).
 * This is a soft delete approach — tasks become standalone rather than being deleted.
 *
 * @param topicId - The topic's UUID
 * @param userId - The authenticated user's UUID (for ownership check)
 * @throws Error if topic not found or not owned by user
 */
export async function deleteTopic(
  topicId: string,
  userId: string
): Promise<void> {
  // First verify ownership
  const topicRows = await db
    .select({ id: topics.id })
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
    .limit(1);

  if (!topicRows[0]) {
    throw new Error("Topic not found or access denied");
  }

  // Reassign all tasks in this topic to no topic (make them standalone)
  await db
    .update(tasks)
    .set({ topicId: null })
    .where(and(eq(tasks.topicId, topicId), eq(tasks.userId, userId)));

  // Delete the topic
  await db
    .delete(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
}
