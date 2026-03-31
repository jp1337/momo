/**
 * Task business logic for Momo.
 * All task-related database operations go through this module.
 * Every function filters by userId to ensure data isolation between users.
 *
 * @module lib/tasks
 */

import { db } from "@/lib/db";
import { tasks, taskCompletions, users } from "@/lib/db/schema";
import { eq, and, isNull, desc, count, sql } from "drizzle-orm";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/validators";
import {
  updateStreak,
  checkAndUnlockAchievements,
  getLevelForCoins,
  type Level,
  type UnlockedAchievement,
} from "@/lib/gamification";

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
  /** Non-null if the user leveled up as a result of this completion */
  newLevel: Level | null;
  /** Achievements newly unlocked by this completion */
  unlockedAchievements: UnlockedAchievement[];
  /** User's current streak after this completion */
  streakCurrent: number;
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
 * All DB operations run inside a single Drizzle transaction so partial failures
 * cannot leave the database in an inconsistent state. Coins are incremented with
 * an atomic SQL expression to prevent read-modify-write races under concurrency.
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
  // Fetch task outside the transaction to fail fast before acquiring a connection
  const task = await getTaskById(taskId, userId);
  if (!task) {
    throw new Error("Task not found or access denied");
  }

  // Prevent double-completion for non-recurring tasks
  if (task.type !== "RECURRING" && task.completedAt !== null) {
    throw new Error("Task is already completed");
  }

  return db.transaction(async (tx) => {
    const now = new Date();
    let updatedTask: Task;

    if (task.type === "RECURRING") {
      // Calculate next due date: today + recurrenceInterval days
      const intervalDays = task.recurrenceInterval ?? 1;
      const nextDue = new Date(now);
      nextDue.setDate(nextDue.getDate() + intervalDays);
      const nextDueStr = nextDue.toISOString().split("T")[0]; // YYYY-MM-DD

      const rows = await tx
        .update(tasks)
        .set({ nextDueDate: nextDueStr })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        .returning();

      updatedTask = rows[0];
    } else {
      // ONE_TIME or DAILY_ELIGIBLE — mark as done
      const rows = await tx
        .update(tasks)
        .set({ completedAt: now })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        .returning();

      updatedTask = rows[0];
    }

    // Record the completion event
    await tx.insert(taskCompletions).values({
      taskId,
      userId,
      completedAt: now,
    });

    // Award coins atomically — avoids read-modify-write race under concurrency
    const coinsEarned = task.coinValue;
    await tx
      .update(users)
      .set({ coins: sql`${users.coins} + ${coinsEarned}` })
      .where(eq(users.id, userId));

    // Read the updated balance once to compute level detection
    const [updatedUser] = await tx
      .select({ coins: users.coins, level: users.level })
      .from(users)
      .where(eq(users.id, userId));

    const newCoins = updatedUser?.coins ?? coinsEarned;
    const coinsBeforeCompletion = newCoins - coinsEarned;

    // Detect level-up
    const levelBefore = getLevelForCoins(coinsBeforeCompletion).level;
    const levelAfter = getLevelForCoins(newCoins);
    const newLevel = levelAfter.level > levelBefore ? levelAfter : null;

    // Update level in DB if it changed
    if (newLevel !== null) {
      await tx
        .update(users)
        .set({ level: newLevel.level })
        .where(eq(users.id, userId));
    }

    // Update streak inside the transaction
    const { streakCurrent } = await updateStreak(userId, tx);

    // Count total completions for achievement context
    const completionCountRows = await tx
      .select({ count: count() })
      .from(taskCompletions)
      .where(eq(taskCompletions.userId, userId));
    const totalCompleted = Number(completionCountRows[0]?.count ?? 0);

    // Check and unlock achievements inside the transaction
    const unlockedAchievements = await checkAndUnlockAchievements(
      userId,
      {
        totalCompleted,
        streakCurrent,
        coins: newCoins,
        level: levelAfter.level,
        isDailyQuestComplete: task.isDailyQuest,
      },
      tx
    );

    return {
      task: updatedTask,
      coinsEarned,
      newLevel,
      unlockedAchievements,
      streakCurrent,
    };
  });
}

/**
 * Reverses the completion of a task (undo complete).
 * Only works for ONE_TIME and DAILY_ELIGIBLE tasks.
 * Deletes the most recent completion record and subtracts coins atomically.
 *
 * All DB operations run inside a single Drizzle transaction. Coins are decremented
 * with an atomic SQL GREATEST expression to prevent negative balances and races.
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

  return db.transaction(async (tx) => {
    // Clear the completion timestamp
    const rows = await tx
      .update(tasks)
      .set({ completedAt: null })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    if (!rows[0]) {
      throw new Error("Task not found or access denied");
    }

    // Delete the most recent completion record
    const completions = await tx
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
      await tx
        .delete(taskCompletions)
        .where(eq(taskCompletions.id, completions[0].id));
    }

    // Subtract coins atomically — GREATEST clamps the result to 0
    await tx
      .update(users)
      .set({
        coins: sql`GREATEST(${users.coins} - ${task.coinValue}, 0)`,
      })
      .where(eq(users.id, userId));

    return rows[0];
  });
}

