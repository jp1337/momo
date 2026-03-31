/**
 * Daily Quest business logic for Momo.
 *
 * Handles selection, retrieval, and postponement of the daily quest task.
 * The daily quest is one task surfaced to the user each day — chosen by priority algorithm.
 *
 * Selection priority order:
 *   1. Oldest overdue task (due_date < today, not completed)
 *   2. High-priority topic subtask (priority = HIGH, has topic_id, not completed)
 *   3. Due recurring task (next_due_date <= today, not completed)
 *   4. Random open task from the pool (not completed, type = DAILY_ELIGIBLE or ONE_TIME)
 *
 * @module lib/daily-quest
 */

import { db } from "@/lib/db";
import { tasks, topics, users } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, lte, lt, or, ne, inArray } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A task row as returned from the database */
export type Task = typeof tasks.$inferSelect;

/** A topic row as returned from the database */
export type Topic = typeof topics.$inferSelect;

/** Task with optional topic data for display */
export interface TaskWithTopic extends Task {
  topic: Topic | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 */
function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Returns the current active daily quest for the user.
 * A quest is "active" when is_daily_quest = true and completed_at IS NULL.
 * Returns null if no active quest exists.
 *
 * @param userId - The user's UUID
 * @returns The active daily quest task, or null
 */
export async function getCurrentDailyQuest(
  userId: string
): Promise<TaskWithTopic | null> {
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true),
        isNull(tasks.completedAt)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  return enrichTaskWithTopic(rows[0]);
}

/**
 * Returns the daily quest task for the user — even if already completed today.
 * Used for showing a completed celebration state on the dashboard.
 *
 * @param userId - The user's UUID
 * @returns The task marked as daily quest (completed or not), or null
 */
export async function getDailyQuestIncludingCompleted(
  userId: string
): Promise<TaskWithTopic | null> {
  const rows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  return enrichTaskWithTopic(rows[0]);
}

/**
 * Selects the daily quest task for a user.
 *
 * Priority order:
 *   1. Oldest overdue task (due_date < today, not completed)
 *   2. High-priority topic subtask (priority = HIGH, has topic_id, not completed)
 *   3. Due recurring task (next_due_date <= today, not completed)
 *   4. Random open task from the pool (not completed, type = DAILY_ELIGIBLE or ONE_TIME)
 *
 * Only selects a new quest if none is active today.
 * Clears the is_daily_quest flag on completed quests from previous days before selecting.
 *
 * @param userId - The user's UUID
 * @returns The selected Task (with topic), or null if no eligible tasks exist
 */
export async function selectDailyQuest(
  userId: string
): Promise<TaskWithTopic | null> {
  // Step 1: Clear is_daily_quest on tasks that are completed (they're done)
  await db
    .update(tasks)
    .set({ isDailyQuest: false })
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true),
        isNotNull(tasks.completedAt)
      )
    );

  // Step 2: Check if there's already an active quest today — don't reselect
  const existing = await getCurrentDailyQuest(userId);
  if (existing) {
    return existing;
  }

  const today = getTodayString();

  // Step 3: Run priority algorithm to find the best task

  // Priority 1: Oldest overdue task (due_date < today, not completed, not recurring)
  const overdueRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, today),
        ne(tasks.type, "RECURRING")
      )
    )
    .orderBy(tasks.dueDate) // oldest first
    .limit(1);

  if (overdueRows[0]) {
    return await assignDailyQuest(overdueRows[0], userId);
  }

  // Priority 2: High-priority topic subtask (has topicId, priority = HIGH, not completed)
  const highPriorityRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        isNotNull(tasks.topicId),
        eq(tasks.priority, "HIGH"),
        ne(tasks.type, "RECURRING")
      )
    )
    .limit(1);

  if (highPriorityRows[0]) {
    return await assignDailyQuest(highPriorityRows[0], userId);
  }

  // Priority 3: Due recurring task (next_due_date <= today, not forcibly completed via completedAt)
  const recurringRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.type, "RECURRING"),
        isNotNull(tasks.nextDueDate),
        lte(tasks.nextDueDate, today)
      )
    )
    .limit(1);

  if (recurringRows[0]) {
    return await assignDailyQuest(recurringRows[0], userId);
  }

  // Priority 4: Random open task (not completed, ONE_TIME or DAILY_ELIGIBLE)
  const poolRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        or(
          eq(tasks.type, "ONE_TIME"),
          eq(tasks.type, "DAILY_ELIGIBLE")
        )
      )
    );

  if (poolRows.length > 0) {
    // Pick a random task from the eligible pool
    const randomIndex = Math.floor(Math.random() * poolRows.length);
    return await assignDailyQuest(poolRows[randomIndex], userId);
  }

  // No eligible tasks found
  return null;
}

/**
 * Force-selects a new daily quest for the user, clearing any existing quest first.
 * Used for admin/dev reselection via POST /api/daily-quest.
 *
 * @param userId - The user's UUID
 * @returns The newly selected Task (with topic), or null if no eligible tasks
 */
export async function forceSelectDailyQuest(
  userId: string
): Promise<TaskWithTopic | null> {
  // Clear any existing daily quest flag (completed or not)
  await db
    .update(tasks)
    .set({ isDailyQuest: false })
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true)
      )
    );

  const today = getTodayString();

  // Run the same priority algorithm as selectDailyQuest (no existing check)

  // Priority 1: Oldest overdue task
  const overdueRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, today),
        ne(tasks.type, "RECURRING")
      )
    )
    .orderBy(tasks.dueDate)
    .limit(1);

  if (overdueRows[0]) {
    return await assignDailyQuest(overdueRows[0], userId);
  }

  // Priority 2: High-priority topic subtask
  const highPriorityRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        isNotNull(tasks.topicId),
        eq(tasks.priority, "HIGH"),
        ne(tasks.type, "RECURRING")
      )
    )
    .limit(1);

  if (highPriorityRows[0]) {
    return await assignDailyQuest(highPriorityRows[0], userId);
  }

  // Priority 3: Due recurring task
  const recurringRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.type, "RECURRING"),
        isNotNull(tasks.nextDueDate),
        lte(tasks.nextDueDate, today)
      )
    )
    .limit(1);

  if (recurringRows[0]) {
    return await assignDailyQuest(recurringRows[0], userId);
  }

  // Priority 4: Random open task
  const poolRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        or(
          eq(tasks.type, "ONE_TIME"),
          eq(tasks.type, "DAILY_ELIGIBLE")
        )
      )
    );

  if (poolRows.length > 0) {
    const randomIndex = Math.floor(Math.random() * poolRows.length);
    return await assignDailyQuest(poolRows[randomIndex], userId);
  }

  return null;
}

/**
 * Marks a task as "not today" — clears is_daily_quest and sets due_date to tomorrow.
 * Does not count as a skip for streak purposes (first postpone per week is free).
 *
 * @param taskId - The task to postpone
 * @param userId - Must own the task
 * @throws Error if task not found, not owned by user, or not the current daily quest
 */
export async function postponeDailyQuest(
  taskId: string,
  userId: string
): Promise<void> {
  // Verify ownership and that the task is the active daily quest
  const taskRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true),
        isNull(tasks.completedAt)
      )
    )
    .limit(1);

  if (!taskRows[0]) {
    throw new Error("Task not found, not owned by user, or not the active daily quest");
  }

  // Calculate tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

  // Clear the daily quest flag and push the due date to tomorrow
  await db
    .update(tasks)
    .set({
      isDailyQuest: false,
      dueDate: tomorrowStr,
    })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.userId, userId)
      )
    );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Sets is_daily_quest = true on the given task and returns it enriched with topic data.
 *
 * @param task - The raw task row to mark as daily quest
 * @param userId - The owning user's UUID (for safety check)
 * @returns The updated task enriched with topic data
 */
async function assignDailyQuest(
  task: Task,
  userId: string
): Promise<TaskWithTopic> {
  await db
    .update(tasks)
    .set({ isDailyQuest: true })
    .where(
      and(
        eq(tasks.id, task.id),
        eq(tasks.userId, userId)
      )
    );

  // Re-fetch to get the updated row
  const updatedRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, task.id))
    .limit(1);

  const updatedTask = updatedRows[0] ?? task;
  return enrichTaskWithTopic({ ...updatedTask, isDailyQuest: true });
}

/**
 * Enriches a task with its associated topic data (or null if no topic).
 *
 * @param task - The raw task row
 * @returns The task with a `topic` field containing topic data or null
 */
async function enrichTaskWithTopic(task: Task): Promise<TaskWithTopic> {
  if (!task.topicId) {
    return { ...task, topic: null };
  }

  const topicRows = await db
    .select()
    .from(topics)
    .where(eq(topics.id, task.topicId))
    .limit(1);

  return { ...task, topic: topicRows[0] ?? null };
}

/**
 * Returns dashboard stats for a user: coin balance, streak, level, and total completions.
 *
 * @param userId - The user's UUID
 * @returns Object with coins, streakCurrent, level fields (or defaults if user not found)
 */
export async function getUserStats(userId: string): Promise<{
  coins: number;
  streakCurrent: number;
  level: number;
}> {
  const userRows = await db
    .select({
      coins: users.coins,
      streakCurrent: users.streakCurrent,
      level: users.level,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    return { coins: 0, streakCurrent: 0, level: 1 };
  }

  return userRows[0];
}
