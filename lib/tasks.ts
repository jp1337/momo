/**
 * Task business logic for Momo.
 * All task-related database operations go through this module.
 * Every function filters by userId to ensure data isolation between users.
 *
 * @module lib/tasks
 */

import { db } from "@/lib/db";
import { tasks, taskCompletions, users, topics, wishlistItems } from "@/lib/db/schema";
import { eq, and, isNull, desc, max, count, sql, inArray, gte } from "drizzle-orm";

// ─── Recurrence Date Helpers ─────────────────────────────────────────────────

/**
 * Advances a YYYY-MM-DD base date by `days` days.
 * Pure arithmetic — avoids DST pitfalls by working in UTC.
 *
 * @param base - YYYY-MM-DD base date
 * @param days - Number of days to advance
 * @returns YYYY-MM-DD result date
 */
function nextDueInterval(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().split("T")[0];
}

/**
 * Finds the next occurrence of any of the given weekdays *after* base.
 * Weekdays are 0 = Monday … 6 = Sunday (ISO weekday convention).
 * Always advances at least one day so the task is not re-due today.
 *
 * @param base - YYYY-MM-DD date to advance from
 * @param weekdays - Array of weekday indices (0–6); must be non-empty
 * @returns YYYY-MM-DD of the earliest matching future weekday
 */
function nextDueWeekday(base: string, weekdays: number[]): string {
  if (weekdays.length === 0) return nextDueInterval(base, 7);
  const [y, m, d] = base.split("-").map(Number);
  // Normalize: JS getUTCDay() returns 0=Sun…6=Sat; convert to 0=Mon…6=Sun
  const jsToIso = (jsDay: number) => (jsDay + 6) % 7;
  let candidate = new Date(Date.UTC(y, m - 1, d + 1)); // start tomorrow
  for (let i = 0; i < 7; i++) {
    const isoDay = jsToIso(candidate.getUTCDay());
    if (weekdays.includes(isoDay)) {
      return candidate.toISOString().split("T")[0];
    }
    candidate = new Date(candidate.getTime() + 86_400_000);
  }
  // Fallback (should never be reached for valid weekdays)
  return nextDueInterval(base, 7);
}

/**
 * Advances a YYYY-MM-DD date by exactly one calendar month, clamping
 * to the last valid day of the target month (e.g. Jan 31 → Feb 28/29).
 *
 * @param base - YYYY-MM-DD date to advance from
 * @returns YYYY-MM-DD result date
 */
function nextDueMonthly(base: string): string {
  const [y, m, d] = base.split("-").map(Number);
  // m is 1-indexed in ISO strings; Date.UTC uses 0-indexed months.
  // Passing m (not m-1) advances to the next month directly.
  // Clamp day to last valid day of the target month to handle e.g. Jan 31 → Feb 28.
  const maxDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // last day of target month
  const clampedDay = Math.min(d, maxDay);
  return new Date(Date.UTC(y, m, clampedDay)).toISOString().split("T")[0];
}

/**
 * Advances a YYYY-MM-DD date by exactly one calendar year, clamping
 * to the last valid day of the target month (handles Feb 29 in non-leap years).
 *
 * @param base - YYYY-MM-DD date to advance from
 * @returns YYYY-MM-DD result date
 */
function nextDueYearly(base: string): string {
  const [y, m, d] = base.split("-").map(Number);
  const nextYear = y + 1;
  const maxDay = new Date(Date.UTC(nextYear, m, 0)).getUTCDate(); // last day of same month next year
  const clampedDay = Math.min(d, maxDay);
  const next = new Date(Date.UTC(nextYear, m - 1, clampedDay));
  return next.toISOString().split("T")[0];
}
import type { CreateTaskInput, UpdateTaskInput, BulkTaskActionInput } from "@/lib/validators";
import {
  updateStreak,
  updateQuestStreak,
  checkAndUnlockAchievements,
  getLevelForCoins,
  type Level,
  type UnlockedAchievement,
} from "@/lib/gamification";
import { getLocalDateString } from "@/lib/date-utils";
import { getEnergyCheckinStreak } from "@/lib/energy";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Filters for listing tasks */
export interface GetUserTasksFilters {
  topicId?: string | null;
  type?: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  completed?: boolean;
}

/** A task row as returned from the database */
export type Task = typeof tasks.$inferSelect;

/** A topic row as returned from the database */
export type Topic = typeof topics.$inferSelect;

/** Result from promoting a task to a topic */
export interface PromoteTaskResult {
  /** The newly created topic */
  topic: Topic;
  /** The original task, now updated with topicId pointing to the new topic */
  task: Task;
}

/** Result from completing a task */
export interface CompleteTaskResult {
  task: Task;
  coinsEarned: number;
  /** Coins earned from achievement unlocks (on top of task coins) */
  achievementCoinsEarned: number;
  /** Non-null if the user leveled up as a result of this completion */
  newLevel: Level | null;
  /** Achievements newly unlocked by this completion */
  unlockedAchievements: UnlockedAchievement[];
  /** User's current streak after this completion */
  streakCurrent: number;
  /** True if the streak shield was consumed to preserve the streak */
  shieldUsed: boolean;
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
  input: CreateTaskInput,
  timezone?: string | null
): Promise<Task> {
  return db.transaction(async (tx) => {
    // When adding a task to a topic, place it at the end of the sort order
    // and inherit the topic's default energy level if the user did not
    // override it explicitly. The user's value (including an explicit `null`
    // for "any energy") always wins.
    let sortOrder = 0;
    let inheritedEnergyLevel: "HIGH" | "MEDIUM" | "LOW" | null = null;
    if (input.topicId) {
      const [result] = await tx
        .select({
          maxOrder: max(tasks.sortOrder),
          defaultEnergyLevel: topics.defaultEnergyLevel,
        })
        .from(topics)
        .leftJoin(tasks, eq(tasks.topicId, topics.id))
        .where(and(eq(topics.id, input.topicId), eq(topics.userId, userId)))
        .groupBy(topics.defaultEnergyLevel);
      if (!result) {
        throw new Error("Topic not found or access denied");
      }
      sortOrder = (result?.maxOrder ?? -1) + 1;
      inheritedEnergyLevel = result?.defaultEnergyLevel ?? null;
    }

    // `input.energyLevel === undefined` means "user didn't touch the field" →
    // fall back to the topic default. An explicit `null` from the user is
    // respected as "any energy" and overrides the inheritance.
    const effectiveEnergyLevel =
      input.energyLevel === undefined
        ? inheritedEnergyLevel
        : (input.energyLevel ?? null);

    const rows = await tx
      .insert(tasks)
      .values({
        userId,
        title: input.title,
        topicId: input.topicId ?? null,
        notes: input.notes ?? null,
        type: input.type,
        priority: input.priority ?? "NORMAL",
        recurrenceInterval: input.recurrenceInterval ?? null,
        recurrenceType: input.recurrenceType ?? "INTERVAL",
        recurrenceWeekdays: input.recurrenceWeekdays
          ? JSON.stringify(input.recurrenceWeekdays)
          : null,
        recurrenceFixed: input.recurrenceFixed ?? false,
        dueDate: input.dueDate ?? null,
        // For RECURRING tasks, set nextDueDate to dueDate (or local today) so the
        // task is immediately visible to the daily quest algorithm.
        // getLocalDateString(timezone) avoids a UTC off-by-one for UTC− users.
        nextDueDate: input.type === "RECURRING"
          ? (input.dueDate ?? getLocalDateString(timezone))
          : null,
        coinValue: input.coinValue ?? 1,
        estimatedMinutes: input.estimatedMinutes ?? null,
        energyLevel: effectiveEnergyLevel,
        sortOrder,
      })
      .returning();

    // Increment the immutable "ever created" counter — never decremented on delete
    await tx
      .update(users)
      .set({ totalTasksCreated: sql`${users.totalTasksCreated} + 1` })
      .where(eq(users.id, userId));

    return rows[0];
  });
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
  if (input.topicId !== undefined) {
    if (input.topicId !== null) {
      const owns = await db
        .select({ id: topics.id })
        .from(topics)
        .where(and(eq(topics.id, input.topicId), eq(topics.userId, userId)))
        .limit(1);
      if (!owns[0]) throw new Error("Topic not found or access denied");
    }
    updateValues.topicId = input.topicId;
  }
  if (input.notes !== undefined) updateValues.notes = input.notes;
  if (input.type !== undefined) updateValues.type = input.type;
  if (input.priority !== undefined) updateValues.priority = input.priority;
  if (input.recurrenceInterval !== undefined)
    updateValues.recurrenceInterval = input.recurrenceInterval;
  if (input.recurrenceType !== undefined)
    updateValues.recurrenceType = input.recurrenceType ?? "INTERVAL";
  if (input.recurrenceWeekdays !== undefined)
    updateValues.recurrenceWeekdays = input.recurrenceWeekdays
      ? JSON.stringify(input.recurrenceWeekdays)
      : null;
  if (input.recurrenceFixed !== undefined)
    updateValues.recurrenceFixed = input.recurrenceFixed ?? false;
  if (input.dueDate !== undefined) updateValues.dueDate = input.dueDate;
  if (input.coinValue !== undefined) updateValues.coinValue = input.coinValue;
  if (input.estimatedMinutes !== undefined) updateValues.estimatedMinutes = input.estimatedMinutes;
  if (input.snoozedUntil !== undefined) updateValues.snoozedUntil = input.snoozedUntil;
  if (input.energyLevel !== undefined) updateValues.energyLevel = input.energyLevel;

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
  userId: string,
  timezone?: string | null
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

  // Prevent completing paused tasks (vacation mode)
  if (task.pausedUntil) {
    const today = getLocalDateString(timezone);
    if (task.pausedUntil >= today) {
      throw new Error("Cannot complete a paused task");
    }
  }

  const { task: updatedTask, coinsEarned, newLevel, newCoins, levelAfter } =
    await db.transaction(async (tx) => {
      const now = new Date();
      let updatedTask: Task;

      if (task.type === "RECURRING") {
        // Determine base date: rolling uses today, fixed uses current nextDueDate.
        // INTERVAL and WEEKDAY are always rolling/calendar-aligned respectively.
        const recType = task.recurrenceType ?? "INTERVAL";
        const today = getLocalDateString(timezone);
        const baseDate =
          (recType === "MONTHLY" || recType === "YEARLY") && task.recurrenceFixed && task.nextDueDate
            ? task.nextDueDate  // fixed: advance from scheduled date
            : today;            // rolling: advance from today (completion date)

        let nextDueStr: string;
        if (recType === "WEEKDAY") {
          const weekdays = (() => {
            try {
              return JSON.parse(task.recurrenceWeekdays ?? "[0]") as number[];
            } catch {
              return [0]; // default Monday on parse error
            }
          })();
          nextDueStr = nextDueWeekday(baseDate, weekdays);
        } else if (recType === "MONTHLY") {
          nextDueStr = nextDueMonthly(baseDate);
        } else if (recType === "YEARLY") {
          nextDueStr = nextDueYearly(baseDate);
        } else {
          // INTERVAL (default / legacy)
          nextDueStr = nextDueInterval(baseDate, task.recurrenceInterval ?? 1);
        }

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
      // Bonus: tasks that were postponed 3+ times award double coins (procrastination reward)
      const coinsEarned = task.postponeCount >= 3 ? task.coinValue * 2 : task.coinValue;
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

      return { task: updatedTask, coinsEarned, newLevel, newCoins, levelAfter };
    });

  // Update streak outside the transaction — a transient streak failure should
  // not roll back the task completion or coin award.
  let streakCurrent = 0;
  let shieldUsed = false;
  try {
    const streakResult = await updateStreak(userId, undefined, timezone);
    streakCurrent = streakResult.streakCurrent;
    shieldUsed = streakResult.shieldUsed;
  } catch (err) {
    console.error("[completeTask] streak update failed (non-fatal):", err);
  }

  // Fire-and-forget streak shield notification if shield was consumed
  if (shieldUsed) {
    // Dynamic import to avoid circular dependency (push.ts imports from db/schema)
    import("@/lib/push").then(({ sendStreakShieldNotification }) =>
      sendStreakShieldNotification(userId, streakCurrent).catch((err) =>
        console.error("[completeTask] shield notification failed (non-fatal):", err)
      )
    );
  }

  // Update quest streak when a daily quest is completed
  let questStreakCurrent = 0;
  if (task.isDailyQuest) {
    try {
      const questStreakResult = await updateQuestStreak(userId, timezone);
      questStreakCurrent = questStreakResult.questStreakCurrent;
    } catch (err) {
      console.error("[completeTask] quest streak update failed (non-fatal):", err);
    }
  }

  // Count total completions and check achievements after streak is known.
  // Gather all context needed for the expanded achievement set — all queries
  // run in parallel to minimise latency.
  const today = getLocalDateString(timezone);
  const todayStart = new Date(today + "T00:00:00Z");

  const [
    completionCountRows,
    highPriorityRows,
    topicCountRows,
    sequentialTopicRows,
    wishlistBoughtRows,
    dailyQuestTodayRows,
    energyStreak,
  ] = await Promise.all([
    db.select({ count: count() }).from(taskCompletions).where(eq(taskCompletions.userId, userId)),
    db
      .select({ count: count() })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(and(eq(taskCompletions.userId, userId), eq(tasks.priority, "HIGH"))),
    db
      .select({ count: count() })
      .from(topics)
      .where(eq(topics.userId, userId)),
    db
      .select({ id: topics.id })
      .from(topics)
      .where(and(eq(topics.userId, userId), eq(topics.sequential, true)))
      .limit(1),
    db
      .select({ count: count() })
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.status, "BOUGHT"))),
    db
      .select({ count: count() })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(
        and(
          eq(taskCompletions.userId, userId),
          eq(tasks.isDailyQuest, true),
          gte(taskCompletions.completedAt, todayStart)
        )
      ),
    getEnergyCheckinStreak(userId, timezone),
  ]);

  const totalCompleted = Number(completionCountRows[0]?.count ?? 0);
  const totalHighPriorityCompleted = Number(highPriorityRows[0]?.count ?? 0);
  const topicsCreated = Number(topicCountRows[0]?.count ?? 0);
  const hasSequentialTopic = sequentialTopicRows.length > 0;
  const totalWishlistBought = Number(wishlistBoughtRows[0]?.count ?? 0);
  const dailyQuestCompletionsToday = Number(dailyQuestTodayRows[0]?.count ?? 0);

  // Determine the local completion hour for secret time-based achievements
  const completionHour = (() => {
    try {
      const tz = timezone ?? "UTC";
      const formatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz });
      return Number(formatter.format(new Date()));
    } catch {
      return new Date().getHours();
    }
  })();

  // Check achievements outside the transaction — a transient failure should
  // not roll back the task completion or coin award.
  let unlockedAchievements: UnlockedAchievement[] = [];
  let achievementCoinsEarned = 0;
  try {
    const achievementResult = await checkAndUnlockAchievements(
      userId,
      {
        totalCompleted,
        streakCurrent,
        coins: newCoins,
        level: levelAfter.level,
        isDailyQuestComplete: task.isDailyQuest ?? false,
        questStreakCurrent,
        completionHour,
        dailyQuestCompletionsToday,
        topicsCreated,
        hasSequentialTopic,
        totalHighPriorityCompleted,
        totalWishlistBought,
        energyCheckinStreak: energyStreak,
      }
    );
    unlockedAchievements = achievementResult.unlocked;
    achievementCoinsEarned = achievementResult.coinsAwarded;
  } catch (err) {
    console.error("[completeTask] achievement check failed (non-fatal):", err);
  }

  // Book achievement coins into the user's balance (atomic SQL expression)
  if (achievementCoinsEarned > 0) {
    try {
      await db
        .update(users)
        .set({ coins: sql`${users.coins} + ${achievementCoinsEarned}` })
        .where(eq(users.id, userId));
    } catch (err) {
      console.error("[completeTask] achievement coin booking failed (non-fatal):", err);
    }
  }

  // Fire-and-forget push notifications for newly unlocked achievements
  if (unlockedAchievements.length > 0) {
    import("@/lib/push").then(({ sendAchievementNotifications }) =>
      sendAchievementNotifications(userId, unlockedAchievements).catch((err) =>
        console.error("[completeTask] achievement notification failed (non-fatal):", err)
      )
    );
  }

  return {
    task: updatedTask,
    coinsEarned,
    achievementCoinsEarned,
    newLevel,
    unlockedAchievements,
    streakCurrent,
    shieldUsed,
  };
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

/**
 * Promotes a standalone task to a new topic in a single atomic transaction.
 *
 * Maps the task's title, notes (→ description), and priority to the new topic.
 * The task itself becomes the first subtask by setting its topicId to the
 * new topic's UUID. All other task fields (dueDate, coinValue, type, etc.)
 * are preserved unchanged.
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID (ownership check)
 * @returns The new topic and the updated task
 * @throws Error if task is not found, not owned by user, or already in a topic
 */
export async function promoteTaskToTopic(
  taskId: string,
  userId: string
): Promise<PromoteTaskResult> {
  return db.transaction(async (tx) => {
    // 1. Verify ownership and existence
    const taskRows = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!taskRows[0]) {
      throw new Error("Task not found or access denied");
    }

    const task = taskRows[0];

    // 2. Guard: task must be standalone (no topic)
    if (task.topicId !== null) {
      throw new Error("Task already belongs to a topic");
    }

    // 3. Create the new topic from task data
    const topicRows = await tx
      .insert(topics)
      .values({
        userId,
        title: task.title,
        description: task.notes ?? null,
        priority: task.priority,
        color: null,
        icon: null,
      })
      .returning();

    const newTopic = topicRows[0];

    // 4. Re-associate the task as the first subtask
    const updatedTaskRows = await tx
      .update(tasks)
      .set({ topicId: newTopic.id })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    return { topic: newTopic, task: updatedTaskRows[0] };
  });
}

/** Result from breaking down a task into subtasks */
export interface BreakdownTaskResult {
  /** The newly created topic (named after the original task) */
  topicId: string;
  /** The newly created subtasks */
  tasks: Task[];
}

/**
 * Breaks a task down into multiple subtasks inside a new topic.
 *
 * The original task is deleted. A new topic is created with the original task's
 * title, and N new tasks are created as subtasks within that topic.
 * All new tasks inherit the original task's priority and type (ONE_TIME).
 *
 * @param taskId - The task's UUID to break down
 * @param userId - Must own the task
 * @param subtaskTitles - Array of 2–10 titles for the new subtasks
 * @returns The new topic's ID and the created subtasks
 * @throws Error if task not found or access denied
 */
export async function breakdownTask(
  taskId: string,
  userId: string,
  subtaskTitles: string[]
): Promise<BreakdownTaskResult> {
  return db.transaction(async (tx) => {
    // Verify ownership
    const taskRows = await tx
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);

    if (!taskRows[0]) {
      throw new Error("Task not found or access denied");
    }

    const originalTask = taskRows[0];

    // Create a new topic named after the original task
    const topicRows = await tx
      .insert(topics)
      .values({
        userId,
        title: originalTask.title,
        description: originalTask.notes ?? null,
        priority: originalTask.priority,
        color: "#f0a500",
        icon: "layer-group",
      })
      .returning();

    const newTopic = topicRows[0];

    // Create the subtasks with sequential sortOrder
    const newTasks = await tx
      .insert(tasks)
      .values(
        subtaskTitles.map((title, index) => ({
          userId,
          topicId: newTopic.id,
          title,
          type: "ONE_TIME" as const,
          priority: originalTask.priority,
          coinValue: originalTask.coinValue,
          sortOrder: index,
        }))
      )
      .returning();

    // Delete the original task (cascade handles task_completions)
    await tx
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    // Increment the immutable "ever created" counter by the number of subtasks.
    // The original task was already counted when it was created; the subtasks are new.
    await tx
      .update(users)
      .set({ totalTasksCreated: sql`${users.totalTasksCreated} + ${subtaskTitles.length}` })
      .where(eq(users.id, userId));

    return { topicId: newTopic.id, tasks: newTasks };
  });
}

// ─── Snooze ──────────────────────────────────────────────────────────────────

/**
 * Snoozes a task until the given date. The task will be hidden from all
 * active views (task list, Quick Wins, Daily Quest) until snoozedUntil <= today.
 *
 * If the task is currently the active Daily Quest, isDailyQuest is cleared
 * so a new quest can be selected.
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID
 * @param snoozedUntil - Date in YYYY-MM-DD format
 * @returns The updated task
 * @throws Error if task not found or not owned by user
 */
export async function snoozeTask(
  taskId: string,
  userId: string,
  snoozedUntil: string
): Promise<Task> {
  const task = await getTaskById(taskId, userId);
  if (!task) {
    throw new Error("Task not found or access denied");
  }

  if (task.completedAt !== null) {
    throw new Error("Cannot snooze a completed task");
  }

  const updateValues: Partial<typeof tasks.$inferInsert> = { snoozedUntil };

  // If this task is the active daily quest, clear it so a new quest is selected
  if (task.isDailyQuest) {
    updateValues.isDailyQuest = false;
  }

  const rows = await db
    .update(tasks)
    .set(updateValues)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  return rows[0];
}

/**
 * Removes the snooze from a task, making it immediately visible again.
 *
 * @param taskId - The task's UUID
 * @param userId - The authenticated user's UUID
 * @returns The updated task
 * @throws Error if task not found or not owned by user
 */
export async function unsnoozeTask(
  taskId: string,
  userId: string
): Promise<Task> {
  const rows = await db
    .update(tasks)
    .set({ snoozedUntil: null })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();

  if (!rows[0]) {
    throw new Error("Task not found or access denied");
  }

  return rows[0];
}

// ─── Reorder ─────────────────────────────────────────────────────────────────

/**
 * Reorders tasks within a topic by updating their sortOrder.
 * The array index of each taskId becomes its new sortOrder value.
 *
 * All task IDs must belong to the given topic and user. The operation
 * runs in a single transaction to ensure atomicity.
 *
 * @param topicId - The topic's UUID
 * @param userId - The authenticated user's UUID (ownership check)
 * @param taskIds - Ordered array of task UUIDs — index = new sortOrder
 * @throws Error if any task is not found or not owned by user/topic
 */
export async function reorderTasks(
  topicId: string,
  userId: string,
  taskIds: string[]
): Promise<void> {
  await db.transaction(async (tx) => {
    // Verify all tasks belong to this topic and user
    const existingTasks = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.topicId, topicId), eq(tasks.userId, userId)));

    const existingIds = new Set(existingTasks.map((t) => t.id));
    for (const id of taskIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Task ${id} not found in topic or access denied`);
      }
    }

    // Bulk update sortOrder for each task
    for (let i = 0; i < taskIds.length; i++) {
      await tx
        .update(tasks)
        .set({ sortOrder: i })
        .where(and(eq(tasks.id, taskIds[i]), eq(tasks.userId, userId)));
    }
  });
}

// ─── Bulk Actions ───────────────────────────────────────────────────────────

/**
 * Applies a bulk action to multiple tasks in a single transaction.
 *
 * Supported actions:
 *  - **delete**: removes all specified tasks (cascade deletes completions)
 *  - **complete**: marks non-completed, non-recurring tasks as done (no gamification — this is a cleanup tool)
 *  - **changeTopic**: moves tasks to a different topic (or null to remove from topic)
 *  - **setPriority**: sets the priority on all specified tasks
 *
 * @param userId - The authenticated user's UUID (ownership filter on every query)
 * @param input - Validated bulk action input (discriminated union)
 * @returns The number of rows actually affected
 */
export async function bulkUpdateTasks(
  userId: string,
  input: BulkTaskActionInput
): Promise<{ affected: number }> {
  return db.transaction(async (tx) => {
    const ownerFilter = and(
      inArray(tasks.id, input.taskIds),
      eq(tasks.userId, userId)
    );

    switch (input.action) {
      case "delete": {
        const deleted = await tx
          .delete(tasks)
          .where(ownerFilter)
          .returning({ id: tasks.id });
        return { affected: deleted.length };
      }

      case "complete": {
        // Only complete non-recurring, non-completed tasks.
        // Recurring tasks have special completion logic (nextDueDate recalc)
        // and should be completed individually.
        const updated = await tx
          .update(tasks)
          .set({ completedAt: new Date() })
          .where(
            and(
              ownerFilter,
              isNull(tasks.completedAt),
              sql`${tasks.type} != 'RECURRING'`
            )
          )
          .returning({ id: tasks.id });
        return { affected: updated.length };
      }

      case "changeTopic": {
        if (input.topicId !== null) {
          const owns = await tx
            .select({ id: topics.id })
            .from(topics)
            .where(and(eq(topics.id, input.topicId), eq(topics.userId, userId)))
            .limit(1);
          if (!owns[0]) throw new Error("Topic not found or access denied");
        }
        const updated = await tx
          .update(tasks)
          .set({ topicId: input.topicId })
          .where(ownerFilter)
          .returning({ id: tasks.id });
        return { affected: updated.length };
      }

      case "setPriority": {
        const updated = await tx
          .update(tasks)
          .set({ priority: input.priority })
          .where(ownerFilter)
          .returning({ id: tasks.id });
        return { affected: updated.length };
      }
    }
  });
}
