/**
 * Weekly review business logic for Momo.
 *
 * Computes a user's weekly performance summary for the /review page
 * and the weekly push notification.
 *
 * Week boundaries: Monday 00:00 → Sunday 23:59:59 in the user's timezone.
 *
 * @module lib/weekly-review
 */

import { db } from "@/lib/db";
import {
  users,
  tasks,
  taskCompletions,
  topics,
  questPostponements,
} from "@/lib/db/schema";
import { count, eq, and, gte, lt, sql, desc } from "drizzle-orm";
import { getLocalDateString } from "@/lib/date-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Top topic with completions this week */
export interface WeeklyTopicSummary {
  title: string;
  icon: string | null;
  completions: number;
}

/**
 * Weekly review data for a single user.
 */
export interface WeeklyReview {
  /** Number of task completions this week */
  completionsThisWeek: number;
  /** Number of task completions last week (for delta comparison) */
  completionsLastWeek: number;
  /** Number of daily quest postponements this week */
  postponementsThisWeek: number;
  /** Sum of coinValue for completions this week */
  coinsEarnedThisWeek: number;
  /** Current streak length */
  streakCurrent: number;
  /** All-time maximum streak */
  streakMax: number;
  /** Tasks created this week */
  tasksCreatedThisWeek: number;
  /** Top 3 topics by completions this week */
  topTopics: WeeklyTopicSummary[];
  /** Monday of the current review week (YYYY-MM-DD) */
  weekStart: string;
  /** Sunday of the current review week (YYYY-MM-DD) */
  weekEnd: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the Monday (start) and following Monday (exclusive end) of the current
 * ISO week in the user's timezone as Date objects.
 *
 * @param timezone - IANA timezone identifier (e.g. "Europe/Berlin")
 * @returns [weekStartDate, weekEndDate] where weekEndDate is the next Monday 00:00
 */
function getWeekBoundaries(timezone?: string | null): {
  weekStartDate: Date;
  weekEndDate: Date;
  weekStartStr: string;
  weekEndStr: string;
} {
  const todayStr = getLocalDateString(timezone);
  const [y, m, d] = todayStr.split("-").map(Number);

  // Create a date in UTC that represents today's local date
  const todayUtc = new Date(Date.UTC(y, m - 1, d));

  // getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const dayOfWeek = todayUtc.getUTCDay();
  // Days since Monday: Mon=0, Tue=1, ..., Sun=6
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Monday 00:00 of the current week
  const mondayUtc = new Date(todayUtc);
  mondayUtc.setUTCDate(mondayUtc.getUTCDate() - daysSinceMonday);

  // Sunday = Monday + 6 days
  const sundayUtc = new Date(mondayUtc);
  sundayUtc.setUTCDate(sundayUtc.getUTCDate() + 6);

  // Next Monday = Monday + 7 (exclusive upper bound for queries)
  const nextMondayUtc = new Date(mondayUtc);
  nextMondayUtc.setUTCDate(nextMondayUtc.getUTCDate() + 7);

  const fmt = (dt: Date) => {
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  return {
    weekStartDate: mondayUtc,
    weekEndDate: nextMondayUtc,
    weekStartStr: fmt(mondayUtc),
    weekEndStr: fmt(sundayUtc),
  };
}

// ─── Main Query ──────────────────────────────────────────────────────────────

/**
 * Fetches the weekly review summary for a single user.
 *
 * Computes completions, postponements, coins earned, streak info,
 * tasks created, and top topics — all scoped to the current ISO week
 * in the user's timezone.
 *
 * All queries run in parallel via Promise.all for minimal latency.
 *
 * @param userId - The user's UUID
 * @param timezone - IANA timezone identifier (e.g. "Europe/Berlin")
 * @returns Weekly review data
 */
export async function getWeeklyReview(
  userId: string,
  timezone?: string | null
): Promise<WeeklyReview> {
  const { weekStartDate, weekEndDate, weekStartStr, weekEndStr } =
    getWeekBoundaries(timezone);

  // Previous week boundaries for comparison delta
  const prevWeekStart = new Date(weekStartDate);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);

  const [
    completionsThisWeekRows,
    completionsLastWeekRows,
    postponementsRows,
    coinsRows,
    userRows,
    tasksCreatedRows,
    topTopicsRows,
  ] = await Promise.all([
    // 1. Completions this week
    db
      .select({ value: count() })
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, weekStartDate),
          lt(taskCompletions.completedAt, weekEndDate)
        )
      ),

    // 2. Completions last week (for delta)
    db
      .select({ value: count() })
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, prevWeekStart),
          lt(taskCompletions.completedAt, weekStartDate)
        )
      ),

    // 3. Postponements this week
    db
      .select({ value: count() })
      .from(questPostponements)
      .where(
        and(
          eq(questPostponements.userId, userId),
          gte(questPostponements.postponedAt, weekStartDate),
          lt(questPostponements.postponedAt, weekEndDate)
        )
      ),

    // 4. Coins earned this week (sum of coinValue for completed tasks)
    db
      .select({
        total: sql<number>`COALESCE(SUM(${tasks.coinValue}), 0)`,
      })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(
        and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, weekStartDate),
          lt(taskCompletions.completedAt, weekEndDate)
        )
      ),

    // 5. User streak info
    db
      .select({
        streakCurrent: users.streakCurrent,
        streakMax: users.streakMax,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),

    // 6. Tasks created this week
    db
      .select({ value: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          gte(tasks.createdAt, weekStartDate),
          lt(tasks.createdAt, weekEndDate)
        )
      ),

    // 7. Top 3 topics by completions this week
    db
      .select({
        title: topics.title,
        icon: topics.icon,
        completions: count(),
      })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .innerJoin(topics, eq(tasks.topicId, topics.id))
      .where(
        and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, weekStartDate),
          lt(taskCompletions.completedAt, weekEndDate)
        )
      )
      .groupBy(topics.id, topics.title, topics.icon)
      .orderBy(desc(count()))
      .limit(3),
  ]);

  const user = userRows[0];

  return {
    completionsThisWeek: completionsThisWeekRows[0]?.value ?? 0,
    completionsLastWeek: completionsLastWeekRows[0]?.value ?? 0,
    postponementsThisWeek: postponementsRows[0]?.value ?? 0,
    coinsEarnedThisWeek: Number(coinsRows[0]?.total ?? 0),
    streakCurrent: user?.streakCurrent ?? 0,
    streakMax: user?.streakMax ?? 0,
    tasksCreatedThisWeek: tasksCreatedRows[0]?.value ?? 0,
    topTopics: topTopicsRows.map((row) => ({
      title: row.title,
      icon: row.icon,
      completions: row.completions,
    })),
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
  };
}
