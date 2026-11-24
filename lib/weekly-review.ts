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
import { getLocalDateString, getLocalMidnightUtc } from "@/lib/date-utils";

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
 * Returns the current ISO week's boundaries in the user's timezone.
 *
 * The Date bounds are local midnights converted to UTC instants — not UTC
 * midnights — so a completion at Monday 00:10 Europe/Berlin (Sunday 23:10 UTC)
 * falls into the new week. Each bound is converted separately, so a DST switch
 * inside the week does not shift the following Monday by an hour.
 *
 * @param timezone - IANA timezone identifier (e.g. "Europe/Berlin")
 * @returns Start of this week, start of next week (exclusive end), start of the
 *   previous week, and the Monday/Sunday of this week as YYYY-MM-DD strings
 */
function getWeekBoundaries(timezone?: string | null): {
  weekStartDate: Date;
  weekEndDate: Date;
  prevWeekStartDate: Date;
  weekStartStr: string;
  weekEndStr: string;
} {
  const [y, m, d] = getLocalDateString(timezone).split("-").map(Number);

  // Calendar arithmetic on the local date, carried in a UTC Date: 0=Sun … 6=Sat
  const today = new Date(Date.UTC(y, m - 1, d));
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const plusDays = (n: number) => {
    const dt = new Date(today);
    dt.setUTCDate(dt.getUTCDate() - daysSinceMonday + n);
    return dt.toISOString().slice(0, 10);
  };

  const mondayStr = plusDays(0);
  return {
    weekStartDate: getLocalMidnightUtc(mondayStr, timezone),
    weekEndDate: getLocalMidnightUtc(plusDays(7), timezone),
    prevWeekStartDate: getLocalMidnightUtc(plusDays(-7), timezone),
    weekStartStr: mondayStr,
    weekEndStr: plusDays(6),
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
  const {
    weekStartDate,
    weekEndDate,
    prevWeekStartDate: prevWeekStart,
    weekStartStr,
    weekEndStr,
  } = getWeekBoundaries(timezone);

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
