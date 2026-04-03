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
import type { Database } from "@/lib/db";
import { tasks, users, topics } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, lte, lt, gte, or, ne, sql } from "drizzle-orm";

/** A Drizzle transaction or the base db instance */
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

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
 * Retrieves the current active daily quest inside a transaction.
 * Used internally by selectDailyQuest to re-check within the transaction boundary.
 *
 * @param userId - The user's UUID
 * @param tx - The active Drizzle transaction
 * @returns The active daily quest task row, or null
 */
async function getCurrentDailyQuestTx(
  userId: string,
  tx: Tx
): Promise<Task | null> {
  const rows = await tx
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

  return rows[0] ?? null;
}

/**
 * Picks the highest-priority eligible task for the daily quest using the algorithm,
 * without assigning the flag. All reads go through the provided transaction client.
 *
 * Priority order:
 *   1. Oldest overdue task (due_date < today, not completed, not recurring)
 *   2. High-priority topic subtask (priority = HIGH, has topic_id, not completed)
 *   3. Due recurring task (next_due_date <= today)
 *   4. Random open task from the pool (ONE_TIME or DAILY_ELIGIBLE, not completed)
 *
 * @param userId - The user's UUID
 * @param tx - The active Drizzle transaction
 * @returns The candidate task row, or null if no eligible task exists
 */
async function pickBestTask(userId: string, tx: Tx): Promise<Task | null> {
  const today = getTodayString();

  // Priority 1: Oldest overdue task
  const overdueRows = await tx
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

  if (overdueRows[0]) return overdueRows[0];

  // Priority 2: High-priority topic subtask
  const highPriorityRows = await tx
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

  if (highPriorityRows[0]) return highPriorityRows[0];

  // Priority 3: Due recurring task
  const recurringRows = await tx
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

  if (recurringRows[0]) return recurringRows[0];

  // Priority 4: Random open task
  const poolRows = await tx
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        or(eq(tasks.type, "ONE_TIME"), eq(tasks.type, "DAILY_ELIGIBLE"))
      )
    );

  if (poolRows.length > 0) {
    const randomIndex = Math.floor(Math.random() * poolRows.length);
    return poolRows[randomIndex];
  }

  return null;
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
 * The entire check-and-set is wrapped in a DB transaction. Inside the transaction the
 * existing-quest check is re-run to eliminate the TOCTOU race where two concurrent
 * requests both see "no quest" and both set different tasks as the daily quest.
 * The UPDATE also includes `.where(eq(tasks.isDailyQuest, false))` as an optimistic
 * lock — if another request already assigned the flag the update returns 0 rows and
 * this call returns null gracefully.
 *
 * @param userId - The user's UUID
 * @returns The selected Task (with topic), or null if no eligible tasks exist
 */
export async function selectDailyQuest(
  userId: string
): Promise<TaskWithTopic | null> {
  const today = getTodayString();
  const todayStart = new Date(`${today}T00:00:00`);

  // If the user already completed a quest today, return it for the celebration
  // state. One quest per day is the intent — don't pick a new one.
  const completedTodayRows = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true),
        isNotNull(tasks.completedAt),
        gte(tasks.completedAt, todayStart)
      )
    )
    .limit(1);

  if (completedTodayRows[0]) {
    return enrichTaskWithTopic(completedTodayRows[0]);
  }

  // Clear is_daily_quest on quests completed on PREVIOUS days — idempotent,
  // no need to serialise with the assignment below.
  await db
    .update(tasks)
    .set({ isDailyQuest: false })
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true),
        isNotNull(tasks.completedAt),
        lt(tasks.completedAt, todayStart)
      )
    );

  return db.transaction(async (tx) => {
    // Re-check inside the transaction to close the TOCTOU window
    const existingTask = await getCurrentDailyQuestTx(userId, tx);
    if (existingTask) {
      return enrichTaskWithTopic(existingTask);
    }

    // Run the priority algorithm using the transaction client
    const candidate = await pickBestTask(userId, tx);
    if (!candidate) return null;

    // Assign — the isDailyQuest = false predicate acts as an optimistic lock.
    // If another concurrent request already set the flag this UPDATE returns 0 rows.
    const [updated] = await tx
      .update(tasks)
      .set({ isDailyQuest: true })
      .where(
        and(
          eq(tasks.id, candidate.id),
          eq(tasks.userId, userId),
          eq(tasks.isDailyQuest, false)
        )
      )
      .returning();

    if (!updated) return null;

    return enrichTaskWithTopic(updated);
  });
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
 * Result of a postpone operation, including the updated postpone counters.
 */
export interface PostponeResult {
  /** How many times the user has postponed their quest today (after this postpone) */
  postponesToday: number;
  /** The user's configured daily postpone limit */
  postponeLimit: number;
}

/**
 * Marks a task as "not today" — clears is_daily_quest and sets due_date to tomorrow.
 * Increments the task's postpone_count and the user's daily postpone counter.
 * Enforces the user's configured daily postpone limit (questPostponeLimit).
 *
 * @param taskId - The task to postpone
 * @param userId - Must own the task
 * @returns PostponeResult with updated counters
 * @throws Error "LIMIT_REACHED" if the user has exhausted their daily postpone budget
 * @throws Error if task not found, not owned by user, or not the current daily quest
 */
export async function postponeDailyQuest(
  taskId: string,
  userId: string
): Promise<PostponeResult> {
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Fetch user's postpone counters and limit
  const userRows = await db
    .select({
      questPostponesToday: users.questPostponesToday,
      questPostponedDate: users.questPostponedDate,
      questPostponeLimit: users.questPostponeLimit,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = userRows[0];
  if (!user) throw new Error("User not found");

  // Reset daily counter if last postpone was on a different day
  const postponesToday =
    user.questPostponedDate === todayStr ? user.questPostponesToday : 0;

  if (postponesToday >= user.questPostponeLimit) {
    throw new Error("LIMIT_REACHED");
  }

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

  const newPostponesToday = postponesToday + 1;

  // Update task (clear quest flag, push due date, increment postpone_count) and user counters atomically
  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        isDailyQuest: false,
        dueDate: tomorrowStr,
        postponeCount: sql`${tasks.postponeCount} + 1`,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    await tx
      .update(users)
      .set({
        questPostponesToday: newPostponesToday,
        questPostponedDate: todayStr,
      })
      .where(eq(users.id, userId));
  });

  return {
    postponesToday: newPostponesToday,
    postponeLimit: user.questPostponeLimit,
  };
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

