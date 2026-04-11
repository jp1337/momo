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
import { tasks, users, topics, questPostponements } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, lte, lt, gte, or, ne, sql, notInArray, asc } from "drizzle-orm";
import { getLocalDateString, getLocalTomorrowString } from "@/lib/date-utils";

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
 * without assigning the flag. All reads go through the provided client (transaction or db).
 *
 * Priority order:
 *   1. Oldest overdue task (due_date < today, not completed, not recurring)
 *   2. High-priority topic subtask (priority = HIGH, has topic_id, not completed)
 *   3. Due recurring task (next_due_date <= today)
 *   4. Random open task from the pool (ONE_TIME or DAILY_ELIGIBLE, not completed)
 *
 * Energy-aware: within each tier, tasks matching the user's energy level (or with
 * no energy level set) are preferred. If none match, any task in the tier is used.
 *
 * @param userId - The user's UUID
 * @param client - A Drizzle transaction or the base db instance
 * @param timezone - Optional IANA timezone string
 * @param userEnergy - The user's self-reported energy level for today (null = no preference)
 * @returns The candidate task row, or null if no eligible task exists
 */
async function pickBestTask(
  userId: string,
  client: Tx | typeof db,
  timezone?: string | null,
  userEnergy?: "HIGH" | "MEDIUM" | "LOW" | null
): Promise<Task | null> {
  const today = getLocalDateString(timezone);

  // Exclude snoozed tasks from all quest candidates
  const notSnoozed = or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, today));

  // Exclude paused tasks (vacation mode) from all quest candidates
  const notPaused = or(isNull(tasks.pausedUntil), lt(tasks.pausedUntil, today));

  // Energy preference filter: matches user energy or untagged tasks
  const energyPreferred = userEnergy
    ? or(eq(tasks.energyLevel, userEnergy), isNull(tasks.energyLevel))
    : undefined;

  // Sequential topics: collect IDs of tasks that are blocked because an
  // earlier task in the same topic is still open. "Open" = not completed
  // AND not currently snoozed — snoozing a task advances the chain so the
  // next one becomes eligible, otherwise a snooze would freeze the whole
  // topic indefinitely.
  const sequentialTopicRows = await client
    .select({ id: topics.id })
    .from(topics)
    .where(and(eq(topics.userId, userId), eq(topics.sequential, true)));

  const blockedTaskIds: string[] = [];
  for (const topic of sequentialTopicRows) {
    const openInTopic = await client
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.topicId, topic.id),
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          notSnoozed,
          notPaused
        )
      )
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
    // Everything after the first open task is blocked until it's done.
    for (let i = 1; i < openInTopic.length; i++) {
      blockedTaskIds.push(openInTopic[i].id);
    }
  }

  const notBlocked =
    blockedTaskIds.length > 0 ? notInArray(tasks.id, blockedTaskIds) : undefined;

  /**
   * Two-pass helper: tries energy-preferred candidates first, falls back to any.
   * For tiers returning a single ordered row (1–3), picks the first match.
   */
  async function pickFromTier(
    baseConditions: ReturnType<typeof and>,
    options?: { orderBy?: typeof tasks.dueDate; randomPool?: boolean }
  ): Promise<Task | null> {
    // Pass 1: energy-preferred
    if (energyPreferred) {
      if (options?.randomPool) {
        const preferred = await client
          .select().from(tasks)
          .where(and(baseConditions, energyPreferred));
        if (preferred.length > 0) {
          return preferred[Math.floor(Math.random() * preferred.length)];
        }
      } else {
        const query = client.select().from(tasks).where(and(baseConditions, energyPreferred));
        const rows = options?.orderBy
          ? await query.orderBy(options.orderBy).limit(1)
          : await query.limit(1);
        if (rows[0]) return rows[0];
      }
    }

    // Pass 2: any energy
    if (options?.randomPool) {
      const all = await client.select().from(tasks).where(baseConditions);
      if (all.length > 0) {
        return all[Math.floor(Math.random() * all.length)];
      }
      return null;
    }

    const query = client.select().from(tasks).where(baseConditions);
    const rows = options?.orderBy
      ? await query.orderBy(options.orderBy).limit(1)
      : await query.limit(1);
    return rows[0] ?? null;
  }

  // Priority 1: Oldest overdue task
  const overdue = await pickFromTier(
    and(
      eq(tasks.userId, userId),
      isNull(tasks.completedAt),
      isNotNull(tasks.dueDate),
      lt(tasks.dueDate, today),
      ne(tasks.type, "RECURRING"),
      notSnoozed,
      notPaused,
      notBlocked
    ),
    { orderBy: tasks.dueDate }
  );
  if (overdue) return overdue;

  // Priority 2: High-priority topic subtask
  const highPriority = await pickFromTier(
    and(
      eq(tasks.userId, userId),
      isNull(tasks.completedAt),
      isNotNull(tasks.topicId),
      eq(tasks.priority, "HIGH"),
      ne(tasks.type, "RECURRING"),
      notSnoozed,
      notPaused,
      notBlocked
    )
  );
  if (highPriority) return highPriority;

  // Priority 3: Due recurring task
  const recurring = await pickFromTier(
    and(
      eq(tasks.userId, userId),
      eq(tasks.type, "RECURRING"),
      isNotNull(tasks.nextDueDate),
      lte(tasks.nextDueDate, today),
      notSnoozed,
      notPaused,
      notBlocked
    )
  );
  if (recurring) return recurring;

  // Priority 4: Random open task
  return pickFromTier(
    and(
      eq(tasks.userId, userId),
      isNull(tasks.completedAt),
      or(eq(tasks.type, "ONE_TIME"), eq(tasks.type, "DAILY_ELIGIBLE")),
      notSnoozed,
      notPaused,
      notBlocked
    ),
    { randomPool: true }
  );
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
 * @param timezone - Optional IANA timezone string (e.g. "Europe/Berlin"). Falls back to UTC.
 * @param energyLevel - Optional energy level to prefer matching tasks
 * @returns The selected Task (with topic), or null if no eligible tasks exist
 */
export async function selectDailyQuest(
  userId: string,
  timezone?: string | null,
  energyLevel?: "HIGH" | "MEDIUM" | "LOW" | null
): Promise<TaskWithTopic | null> {
  const today = getLocalDateString(timezone);
  const todayStart = new Date(`${today}T00:00:00Z`);

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

  // Clear is_daily_quest on quests from PREVIOUS days that were never completed
  // (dailyQuestDate < today, or null for pre-migration rows). Without this,
  // an uncompleted quest would persist indefinitely as the active quest.
  await db
    .update(tasks)
    .set({ isDailyQuest: false, dailyQuestDate: null })
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true),
        isNull(tasks.completedAt),
        or(
          isNull(tasks.dailyQuestDate),
          lt(tasks.dailyQuestDate, today)
        )
      )
    );

  return db.transaction(async (tx) => {
    // Re-check inside the transaction to close the TOCTOU window
    const existingTask = await getCurrentDailyQuestTx(userId, tx);
    if (existingTask) {
      return enrichTaskWithTopic(existingTask);
    }

    // Run the priority algorithm using the transaction client
    const candidate = await pickBestTask(userId, tx, timezone, energyLevel);
    if (!candidate) return null;

    // Assign — the isDailyQuest = false predicate acts as an optimistic lock.
    // If another concurrent request already set the flag this UPDATE returns 0 rows.
    const [updated] = await tx
      .update(tasks)
      .set({ isDailyQuest: true, dailyQuestDate: today })
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
 * @param timezone - Optional IANA timezone string. Falls back to UTC.
 * @param energyLevel - Optional energy level to prefer matching tasks
 * @returns The newly selected Task (with topic), or null if no eligible tasks
 */
export async function forceSelectDailyQuest(
  userId: string,
  timezone?: string | null,
  energyLevel?: "HIGH" | "MEDIUM" | "LOW" | null
): Promise<TaskWithTopic | null> {
  // Clear any existing daily quest flag (completed or not)
  await db
    .update(tasks)
    .set({ isDailyQuest: false, dailyQuestDate: null })
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isDailyQuest, true)
      )
    );

  const today = getLocalDateString(timezone);

  // Reuse the shared priority algorithm (no transaction needed — no TOCTOU concern for force-select)
  const candidate = await pickBestTask(userId, db, timezone, energyLevel);
  if (!candidate) return null;

  return await assignDailyQuest(candidate, userId, today);
}

/**
 * Result of a re-roll attempt after an energy check-in.
 */
export interface ReselectQuestResult {
  /** The current quest after the (possibly no-op) re-roll. */
  quest: TaskWithTopic | null;
  /** True iff the quest was actually swapped for a better-matching one. */
  swapped: boolean;
  /** The id of the previous quest — only set when `swapped` is true.
   *  Used by the UI Undo link to re-pin the original. */
  previousQuestId?: string;
  /** The title of the previous quest — only set when `swapped` is true. */
  previousQuestTitle?: string;
}

/**
 * Re-rolls the daily quest if (and only if) the current quest's energy tag
 * does not match the user's current energy and a strictly-better candidate
 * exists. Idempotent in all other cases.
 *
 * Decision tree:
 *  1. No active quest → fall through to `selectDailyQuest` with the energy
 *     preference. Returns `swapped: false` because nothing was replaced.
 *  2. Quest already complete → leave it alone (the user has earned the day).
 *  3. Quest has no energy tag → keep it (untagged tasks are universal).
 *  4. Quest matches the requested energy → keep it.
 *  5. Real mismatch → search for a better candidate via `pickBestTask` with
 *     the new energy preference. If none exists or it's the same task we
 *     already had, keep the current quest. Otherwise clear the old flag and
 *     assign the new quest atomically.
 *
 * Used by the energy check-in endpoint to make the inline check-in card
 * actually do something visible.
 *
 * @param userId - Authenticated user UUID
 * @param energyLevel - The user's freshly-reported energy level
 * @param timezone - User's IANA timezone (used for the local "today" string)
 */
export async function reselectQuestForEnergy(
  userId: string,
  energyLevel: "HIGH" | "MEDIUM" | "LOW",
  timezone?: string | null
): Promise<ReselectQuestResult> {
  const current = await getCurrentDailyQuest(userId);

  // (1) No active quest → just select one with the energy preference.
  if (!current) {
    const fresh = await selectDailyQuest(userId, timezone, energyLevel);
    return { quest: fresh, swapped: false };
  }

  // (2) Quest already done — never undo a celebration.
  if (current.completedAt !== null) {
    return { quest: current, swapped: false };
  }

  // (3) Untagged or already-matching quest → keep it.
  if (current.energyLevel === null || current.energyLevel === energyLevel) {
    return { quest: current, swapped: false };
  }

  // (4) Real mismatch — look for a better candidate.
  const better = await pickBestTask(userId, db, timezone, energyLevel);
  if (!better || better.id === current.id) {
    return { quest: current, swapped: false };
  }

  // (5) Swap atomically: clear old flag first, then assign the new quest.
  // Race-safety note: if the user completes the old quest in the middle of
  // this swap, the UPDATE on the old row still succeeds (just clears a flag
  // on a completed task), and the new quest assignment is unaffected.
  const today = getLocalDateString(timezone);
  await db
    .update(tasks)
    .set({ isDailyQuest: false, dailyQuestDate: null })
    .where(and(eq(tasks.userId, userId), eq(tasks.isDailyQuest, true)));

  const newQuest = await assignDailyQuest(better, userId, today);

  return {
    quest: newQuest,
    swapped: true,
    previousQuestId: current.id,
    previousQuestTitle: current.title,
  };
}

/**
 * Pins a specific task as today's daily quest, replacing whatever is currently
 * active. Used by the Undo link in the energy check-in card to restore the
 * pre-reroll quest.
 *
 * Validates ownership and that the task is not snoozed/completed before
 * pinning. Returns null if the target task is invalid.
 *
 * @param userId - Authenticated user UUID
 * @param taskId - Task to pin as daily quest
 * @param timezone - User's IANA timezone
 */
export async function pinTaskAsDailyQuest(
  userId: string,
  taskId: string,
  timezone?: string | null
): Promise<TaskWithTopic | null> {
  const today = getLocalDateString(timezone);

  // Verify the target task is eligible (owned, not completed, not snoozed past today)
  const targetRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  const target = targetRows[0];
  if (!target) return null;
  if (target.completedAt !== null) return null;
  if (target.snoozedUntil !== null && target.snoozedUntil > today) return null;

  // Clear any existing quest flag
  await db
    .update(tasks)
    .set({ isDailyQuest: false, dailyQuestDate: null })
    .where(and(eq(tasks.userId, userId), eq(tasks.isDailyQuest, true)));

  return assignDailyQuest(target, userId, today);
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
  userId: string,
  timezone?: string | null
): Promise<PostponeResult> {
  const todayStr = getLocalDateString(timezone);

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

  // Calculate tomorrow's date in the user's timezone
  const tomorrowStr = getLocalTomorrowString(timezone);

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

    // Log the postponement event for weekly review analytics
    await tx.insert(questPostponements).values({ userId, taskId });
  });

  return {
    postponesToday: newPostponesToday,
    postponeLimit: user.questPostponeLimit,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Sets is_daily_quest = true and daily_quest_date = today on the given task,
 * then returns it enriched with topic data.
 *
 * @param task - The raw task row to mark as daily quest
 * @param userId - The owning user's UUID (for safety check)
 * @param today - Today's date string (YYYY-MM-DD) in the user's timezone
 * @returns The updated task enriched with topic data
 */
async function assignDailyQuest(
  task: Task,
  userId: string,
  today: string
): Promise<TaskWithTopic> {
  await db
    .update(tasks)
    .set({ isDailyQuest: true, dailyQuestDate: today })
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

