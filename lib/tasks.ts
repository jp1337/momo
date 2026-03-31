/**
 * Task business logic for Momo.
 * All task-related database operations go through this module.
 * Every function filters by userId to ensure data isolation between users.
 *
 * @module lib/tasks
 */

import { db } from "@/lib/db";
import { tasks, taskCompletions, users } from "@/lib/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validators";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Filters for listing tasks */
export interface GetUserTasksFilters {
  topicId?: string | null;
  type?: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  completed?: boolean;
}

/** A task row as returned from the database */
export type Task = typeof tasks.$inferSelect;

/** Result from completing a task */
export interface CompleteTaskResult {
  task: Task;
  coinsEarned: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Retrieves all tasks for a given user, with optional filtering.
 *
 * @param userId - The authenticated user's UUID
 * @param filters - Optional filters: topicId, type, completed status
 * @returns Array of tasks ordered by creation date descending
 */
export async function getUserTasks(
  userId: string,
  filters?: GetUserTasksFilters
): Promise<Task[]> {
  // Build all conditions
  const conditions = [eq(tasks.userId, userId)];

  if (filters?.topicId !== undefined) {
    if (filters.topicId === null) {
      conditions.push(isNull(tasks.topicId));
    } else {
      conditions.push(eq(tasks.topicId, filters.topicId));
    }
  }

  if (filters?.type) {
    conditions.push(eq(tasks.type, filters.type));
  }

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));

  // Filter by completion status in JS to avoid complex SQL null checks
  if (filters?.completed === true) {
    return rows.filter((t) => t.completedAt !== null);
  }
  if (filters?.completed === false) {
    return rows.filter((t) => t.completedAt === null);
  }

  return rows;
}

/**
 * Retrieves a single task by ID, scoped to the authenticated user.
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID
 * @returns The task if found and owned by the user, or null
 */
export async function getTaskById(
  taskId: string,
  userId: string
): Promise<Task | null> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Creates a new task for a user.
 *
 * @param userId - The authenticated user's UUID
 * @param input - Validated task creation input
 * @returns The newly created task
 */
export async function createTask(
  userId: string,
  input: CreateTaskInput
): Promise<Task> {
  const rows = await db
    .insert(tasks)
    .values({
      userId,
      title: input.title,
      topicId: input.topicId ?? null,
      notes: input.notes ?? null,
      type: input.type,
      priority: input.priority ?? "NORMAL",
      recurrenceInterval: input.recurrenceInterval ?? null,
      dueDate: input.dueDate ?? null,
      coinValue: input.coinValue ?? 1,
    })
    .returning();

  return rows[0];
}

/**
 * Updates an existing task.
 * Only the fields provided in input are updated (partial update).
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID (for ownership check)
 * @param input - Partial update input
 * @returns The updated task
 * @throws Error if task not found or not owned by user
 */
export async function updateTask(
  taskId: string,
  userId: string,
  input: UpdateTaskInput
): Promise<Task> {
  // Build the update object — only include defined fields
  const updateValues: Partial<typeof tasks.$inferInsert> = {};

  if (input.title !== undefined) updateValues.title = input.title;
  if (input.topicId !== undefined) updateValues.topicId = input.topicId;
  if (input.notes !== undefined) updateValues.notes = input.notes;
  if (input.type !== undefined) updateValues.type = input.type;
  if (input.priority !== undefined) updateValues.priority = input.priority;
  if (input.recurrenceInterval !== undefined)
    updateValues.recurrenceInterval = input.recurrenceInterval;
  if (input.dueDate !== undefined) updateValues.dueDate = input.dueDate;
  if (input.coinValue !== undefined) updateValues.coinValue = input.coinValue;

  const rows = await db
    .update(tasks)
    .set(updateValues)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  if (!rows[0]) {
    throw new Error("Task not found or access denied");
  }

  return rows[0];
}

/**
 * Deletes a task owned by the user.
 * Related task_completions are deleted via ON DELETE CASCADE.
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID (for ownership check)
 * @throws Error if task not found or not owned by user
 */
export async function deleteTask(
  taskId: string,
  userId: string
): Promise<void> {
  const rows = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });

  if (!rows[0]) {
    throw new Error("Task not found or access denied");
  }
}

/**
 * Marks a task as completed and awards coins to the user.
 *
 * Completion logic by task type:
 *  - ONE_TIME / DAILY_ELIGIBLE: sets completed_at = now, records completion, awards coins
 *  - RECURRING: records completion, recalculates next_due_date (now + interval days),
 *    keeps completed_at null (task stays active), awards coins
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID
 * @returns The updated task and the number of coins earned
 * @throws Error if task not found, not owned by user, or already completed
 */
export async function completeTask(
  taskId: string,
  userId: string
): Promise<CompleteTaskResult> {
  // Fetch task first to verify ownership and get type/coinValue
  const task = await getTaskById(taskId, userId);
  if (!task) {
    throw new Error("Task not found or access denied");
  }

  // Prevent double-completion for non-recurring tasks
  if (task.type !== "RECURRING" && task.completedAt !== null) {
    throw new Error("Task is already completed");
  }

  const now = new Date();
  let updatedTask: Task;

  if (task.type === "RECURRING") {
    // Calculate next due date: today + recurrenceInterval days
    const intervalDays = task.recurrenceInterval ?? 1;
    const nextDue = new Date(now);
    nextDue.setDate(nextDue.getDate() + intervalDays);
    const nextDueStr = nextDue.toISOString().split("T")[0]; // YYYY-MM-DD

    const rows = await db
      .update(tasks)
      .set({ nextDueDate: nextDueStr })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    updatedTask = rows[0];
  } else {
    // ONE_TIME or DAILY_ELIGIBLE — mark as done
    const rows = await db
      .update(tasks)
      .set({ completedAt: now })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    updatedTask = rows[0];
  }

  // Record the completion event
  await db.insert(taskCompletions).values({
    taskId,
    userId,
    completedAt: now,
  });

  // Award coins to the user
  const coinsEarned = task.coinValue;
  await incrementUserCoins(userId, coinsEarned);

  return { task: updatedTask, coinsEarned };
}

/**
 * Reverses the completion of a task (undo complete).
 * Only works for ONE_TIME and DAILY_ELIGIBLE tasks.
 * Deletes the most recent completion record and subtracts coins.
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID
 * @returns The updated (uncompleted) task
 * @throws Error if task not found, not owned by user, or not completable
 */
export async function uncompleteTask(
  taskId: string,
  userId: string
): Promise<Task> {
  const task = await getTaskById(taskId, userId);
  if (!task) {
    throw new Error("Task not found or access denied");
  }

  if (task.type === "RECURRING") {
    throw new Error("Recurring tasks cannot be uncompleted");
  }

  if (task.completedAt === null) {
    throw new Error("Task is not completed");
  }

  // Clear the completion timestamp
  const rows = await db
    .update(tasks)
    .set({ completedAt: null })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  if (!rows[0]) {
    throw new Error("Task not found or access denied");
  }

  // Delete the most recent completion record
  const completions = await db
    .select()
    .from(taskCompletions)
    .where(
      and(
        eq(taskCompletions.taskId, taskId),
        eq(taskCompletions.userId, userId)
      )
    )
    .orderBy(desc(taskCompletions.completedAt))
    .limit(1);

  if (completions[0]) {
    await db
      .delete(taskCompletions)
      .where(eq(taskCompletions.id, completions[0].id));
  }

  // Subtract coins — clamp to 0 to avoid negative balances
  await decrementUserCoins(userId, task.coinValue);

  return rows[0];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Increments a user's coin balance by the given amount.
 *
 * @param userId - The user's UUID
 * @param amount - Number of coins to add
 */
async function incrementUserCoins(
  userId: string,
  amount: number
): Promise<void> {
  const userRows = await db
    .select({ coins: users.coins })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRows[0]) {
    const newCoins = userRows[0].coins + amount;
    await db
      .update(users)
      .set({ coins: newCoins })
      .where(eq(users.id, userId));
  }
}

/**
 * Decrements a user's coin balance, clamping to a minimum of 0.
 *
 * @param userId - The user's UUID
 * @param amount - Number of coins to subtract
 */
async function decrementUserCoins(
  userId: string,
  amount: number
): Promise<void> {
  const userRows = await db
    .select({ coins: users.coins })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRows[0]) {
    const newCoins = Math.max(0, userRows[0].coins - amount);
    await db
      .update(users)
      .set({ coins: newCoins })
      .where(eq(users.id, userId));
  }
}
