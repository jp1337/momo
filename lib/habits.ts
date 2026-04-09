/**
 * Habit tracker business logic.
 *
 * Powers the `/habits` page — a GitHub-style year contribution grid per
 * recurring task. Read-only: every completion event is already logged to
 * `task_completions` by `lib/tasks.ts::completeTask`, so no schema change
 * or write path is needed.
 *
 * Why this lives in its own module:
 *  - The /habits page is the only consumer today, but the queries are a
 *    natural fit for future extensions (e.g. habit-specific streak scoring
 *    or weekly-review callouts) and keeping them out of `lib/tasks.ts`
 *    avoids bloating the already-busy task CRUD module.
 *
 * @module lib/habits
 */

import { db } from "@/lib/db";
import { tasks, taskCompletions, topics } from "@/lib/db/schema";
import { and, eq, gte, lt, isNull, asc } from "drizzle-orm";

/** One calendar day with ≥ 1 completion for a single habit. */
export interface DailyCompletion {
  /** Local date in YYYY-MM-DD format */
  date: string;
  /** How many times the habit was completed on that day (usually 1, ≥ 2 means the user re-completed) */
  count: number;
}

/**
 * Current and best streak for a single habit, expressed in *periods*.
 *
 * A period is a rolling window of `periodDays` days anchored on today's
 * local date. For a habit with `recurrenceInterval = 7`, periods are
 * `[today-6d … today]`, `[today-13d … today-7d]`, etc. The streak is the
 * number of consecutive successful periods (≥ 1 completion per period)
 * counted backwards from today.
 *
 * See {@link computeHabitStreak} for the full algorithm and edge cases.
 */
export interface HabitStreak {
  /** Length of the currently running streak in periods. 0 if the last required period was missed. */
  current: number;
  /** Longest streak this habit has ever reached (across all time, not just the requested year). */
  best: number;
  /** Period length in days — `recurrenceInterval ?? 1`. Exposed so the UI can render units. */
  periodDays: number;
}

/** A recurring task with its completion history for a given year. */
export interface HabitWithHistory {
  id: string;
  title: string;
  /** Interval in days between occurrences (null = unspecified, treated as 1) */
  recurrenceInterval: number | null;
  topicId: string | null;
  topicTitle: string | null;
  topicColor: string | null;
  topicIcon: string | null;
  /** Sorted ascending by date, only days with count > 0 */
  completions: DailyCompletion[];
  /** Sum of completions within the requested year */
  totalYear: number;
  /** Sum of completions in the last 30 calendar days (relative to now) */
  totalLast30: number;
  /** Sum of completions in the last 7 calendar days (relative to now) */
  totalLast7: number;
  /** Current and all-time-best streak, computed over the habit's entire history. */
  streak: HabitStreak;
}

/**
 * Formats a Date as a YYYY-MM-DD string using the given IANA timezone,
 * falling back to the server's local time if the timezone is invalid or
 * absent. Mirrors the approach in `lib/date-utils.ts::getLocalDateString`
 * but for arbitrary Date instances, not "today".
 */
function toLocalDateString(date: Date, timezone?: string | null): string {
  if (timezone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    } catch {
      // Invalid timezone — fall through
    }
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parses a YYYY-MM-DD string into a stable "day index" — the number of
 * days since 1970-01-01 at UTC midnight. Two dates on the same local day
 * produce the same index regardless of timezone, which lets the streak
 * algorithm do pure integer arithmetic on calendar days.
 */
function dayIndexFromIsoDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Computes the current and best streak for one habit.
 *
 * A *period* is a rolling window of `N = recurrenceInterval ?? 1` days.
 * The zeroth period is `[today - (N-1), today]`; the k-th period is the
 * same window shifted back by `k * N` days. A period is "successful" if
 * at least one completion lands inside it.
 *
 * **Current streak** — counted backwards from today:
 *  1. If the zeroth period is successful, start the counter at 1 and
 *     continue backwards.
 *  2. If the zeroth period is *empty but still open* (trivially true by
 *     definition — today is inside it), the streak is *not yet broken*:
 *     we simply skip period 0 and count from period 1 onward. This gives
 *     a "grace" effect so a weekly habit does not visually reset the
 *     instant the user logs in on the morning after a completion.
 *  3. The first empty period at `k ≥ 1` ends the count.
 *
 * **Best streak** — a linear pass over all completion days grouped into
 * period indices. Consecutive indices extend the current run; a gap
 * resets it. The maximum run ever seen wins.
 *
 * **Edge cases:**
 *  - Multiple completions inside one period count as a single success.
 *  - Habits with no completions return `{ current: 0, best: 0 }`.
 *  - `recurrenceInterval <= 0` or `null` is normalized to 1.
 *  - Snoozed/future-dated tasks are not handled here — snooze shifts the
 *    `nextDueDate` but leaves `task_completions` untouched, so the streak
 *    is unaffected (intentional: snooze pauses the reminder, not the
 *    habit's record).
 *  - **Calendar drift at long intervals** — recurrence today is a rolling
 *    day count, not a calendar rule. A "monthly" habit with
 *    `recurrenceInterval = 30` completed on Jan 9 and Feb 9 (= 31 days
 *    later) places both completions in the same 30-day window from the
 *    user's perspective once enough drift accumulates, which can
 *    under-count long streaks. The roadmap's "Erweiterte
 *    Wiederholungsregeln" item (WEEKDAY/MONTHLY/YEARLY recurrence rules)
 *    will fix this at the source; until then, 1-day and 7-day intervals
 *    are the reliable cases.
 *
 * @param completionDates - Distinct YYYY-MM-DD completion days in the
 *   user's local timezone, in *any* order. Duplicate dates are tolerated.
 * @param recurrenceInterval - Period length in days, `null` → 1.
 * @param today - Today's YYYY-MM-DD in the user's local timezone.
 * @returns The current and best streak counted in periods.
 */
export function computeHabitStreak(
  completionDates: string[],
  recurrenceInterval: number | null,
  today: string
): HabitStreak {
  const periodDays =
    recurrenceInterval && recurrenceInterval > 0 ? recurrenceInterval : 1;

  if (completionDates.length === 0) {
    return { current: 0, best: 0, periodDays };
  }

  const todayIdx = dayIndexFromIsoDate(today);

  // Convert each completion to its period index relative to "today".
  // Period 0 is [today - (N-1), today]; period k is that window shifted
  // back by k * N. For a completion at day index `d`, its period index
  // is `floor((todayIdx - d) / periodDays)`. Negative indices mean the
  // completion happened *after* today (clock skew, test seeds); we drop
  // those rather than misattributing them.
  const periodSet = new Set<number>();
  for (const iso of completionDates) {
    const d = dayIndexFromIsoDate(iso);
    const pIdx = Math.floor((todayIdx - d) / periodDays);
    if (pIdx >= 0) periodSet.add(pIdx);
  }

  if (periodSet.size === 0) {
    return { current: 0, best: 0, periodDays };
  }

  // ── Current streak (backwards from period 0) ─────────────────────────
  let current = 0;
  if (periodSet.has(0)) {
    // Period 0 is successful — count it and walk backwards.
    current = 1;
    let k = 1;
    while (periodSet.has(k)) {
      current += 1;
      k += 1;
    }
  } else {
    // Period 0 has no completion yet — still "grace" because today is
    // inside it. Skip period 0 and count from period 1 backwards.
    let k = 1;
    while (periodSet.has(k)) {
      current += 1;
      k += 1;
    }
  }

  // ── Best streak (max consecutive run over all periods ever) ──────────
  const sortedPeriods = Array.from(periodSet).sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedPeriods.length; i++) {
    if (sortedPeriods[i] === sortedPeriods[i - 1] + 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  // The running streak is itself a candidate for "best".
  if (current > best) best = current;

  return { current, best, periodDays };
}

/**
 * Fetches every RECURRING task owned by the user plus its completion
 * history for the given year and rolling 30-day window. Tasks without any
 * completions are still returned so the /habits page can render empty grids
 * for freshly-created habits.
 *
 * The query range is `[min(yearStart, now - 30d), yearEnd)` — a single
 * database round-trip is enough to compute all three windows (year, last
 * 30 days, last 7 days). Completion events are aggregated by local date in
 * JavaScript; passing a timezone lets us group correctly for users who
 * complete tasks near midnight.
 *
 * @param userId - Authenticated user UUID
 * @param year - Calendar year to render the grid for
 * @param timezone - IANA timezone of the user (optional; falls back to server time)
 */
export async function getHabitsWithHistory(
  userId: string,
  year: number,
  timezone?: string | null
): Promise<HabitWithHistory[]> {
  const now = new Date();
  const yearStartUtc = new Date(Date.UTC(year, 0, 1));
  // Exclusive upper bound: start of the next year
  const yearEndUtc = new Date(Date.UTC(year + 1, 0, 1));
  // Rolling 30-day window anchor (relative to *now*, not to the year)
  const last30Anchor = new Date(now);
  last30Anchor.setUTCDate(last30Anchor.getUTCDate() - 30);
  const last7Anchor = new Date(now);
  last7Anchor.setUTCDate(last7Anchor.getUTCDate() - 7);
  // Fetch completions from whichever anchor is earlier so we cover all
  // three windows with one query. Timezone jitter at the year boundary is
  // handled by pulling one extra day on each side.
  const fetchFrom = new Date(
    Math.min(yearStartUtc.getTime(), last30Anchor.getTime()) - 24 * 60 * 60 * 1000
  );
  const fetchTo = new Date(Math.max(yearEndUtc.getTime(), now.getTime()) + 24 * 60 * 60 * 1000);

  // Step 1: all recurring habits owned by the user, with optional topic meta.
  const habitRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      recurrenceInterval: tasks.recurrenceInterval,
      topicId: tasks.topicId,
      topicTitle: topics.title,
      topicColor: topics.color,
      topicIcon: topics.icon,
    })
    .from(tasks)
    .leftJoin(topics, eq(tasks.topicId, topics.id))
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.type, "RECURRING"),
        // Recurring tasks legitimately never have completedAt set, but we
        // guard against any stale row from a past schema anyway.
        isNull(tasks.completedAt)
      )
    )
    .orderBy(asc(tasks.createdAt));

  if (habitRows.length === 0) {
    return [];
  }

  // Step 2: all completion events for this user in the combined window.
  // A single query over the scoped date range — Postgres will use the
  // (user_id, task_id) index that already exists for foreign keys.
  const completionRows = await db
    .select({
      taskId: taskCompletions.taskId,
      completedAt: taskCompletions.completedAt,
    })
    .from(taskCompletions)
    .where(
      and(
        eq(taskCompletions.userId, userId),
        gte(taskCompletions.completedAt, fetchFrom),
        lt(taskCompletions.completedAt, fetchTo)
      )
    );

  // Step 3: *all* completion dates for every recurring habit, ever —
  // needed so the "best streak" reflects the all-time record and not
  // just whatever happened to fall inside the year-view window. We only
  // need the local date string per row, not the raw timestamp, so we
  // let Postgres stream back the minimum data.
  const allCompletionRows = await db
    .select({
      taskId: taskCompletions.taskId,
      completedAt: taskCompletions.completedAt,
    })
    .from(taskCompletions)
    .where(eq(taskCompletions.userId, userId));

  const allDatesByTask = new Map<string, Set<string>>();
  for (const row of allCompletionRows) {
    const dateStr = toLocalDateString(row.completedAt, timezone);
    let set = allDatesByTask.get(row.taskId);
    if (!set) {
      set = new Set();
      allDatesByTask.set(row.taskId, set);
    }
    set.add(dateStr);
  }

  // "Today" in the user's local calendar drives the streak's period-0
  // anchor. Using the same `toLocalDateString` helper keeps this
  // consistent with the grid bucketing above.
  const todayStr = toLocalDateString(now, timezone);

  // Aggregate in JS: for each habit, bucket completions by local date and
  // compute the three window totals. Using JS (rather than SQL GROUP BY)
  // keeps the timezone handling consistent with how the rest of the app
  // resolves "today" — see `lib/date-utils.ts`.
  const yearStartStr = toLocalDateString(yearStartUtc, timezone);
  const yearEndStr = toLocalDateString(
    new Date(yearEndUtc.getTime() - 1),
    timezone
  );

  const buckets = new Map<string, Map<string, number>>();
  for (const row of completionRows) {
    const dateStr = toLocalDateString(row.completedAt, timezone);
    let taskBucket = buckets.get(row.taskId);
    if (!taskBucket) {
      taskBucket = new Map();
      buckets.set(row.taskId, taskBucket);
    }
    taskBucket.set(dateStr, (taskBucket.get(dateStr) ?? 0) + 1);
  }

  const last30Cutoff = last30Anchor.getTime();
  const last7Cutoff = last7Anchor.getTime();

  // Second pass on the flat event list: tally the rolling-window totals.
  // A separate pass (not the bucket map) is used here because the rolling
  // windows are anchored on the raw timestamp, not on the local date.
  const totals = new Map<
    string,
    { year: number; last30: number; last7: number }
  >();
  for (const row of completionRows) {
    const dateStr = toLocalDateString(row.completedAt, timezone);
    const inYear = dateStr >= yearStartStr && dateStr <= yearEndStr;
    const ts = row.completedAt.getTime();
    const inLast30 = ts >= last30Cutoff;
    const inLast7 = ts >= last7Cutoff;
    if (!inYear && !inLast30 && !inLast7) continue;
    let t = totals.get(row.taskId);
    if (!t) {
      t = { year: 0, last30: 0, last7: 0 };
      totals.set(row.taskId, t);
    }
    if (inYear) t.year += 1;
    if (inLast30) t.last30 += 1;
    if (inLast7) t.last7 += 1;
  }

  return habitRows.map((h) => {
    const taskBucket = buckets.get(h.id);
    const completions: DailyCompletion[] = [];
    if (taskBucket) {
      for (const [date, count] of taskBucket.entries()) {
        if (date >= yearStartStr && date <= yearEndStr) {
          completions.push({ date, count });
        }
      }
      completions.sort((a, b) => a.date.localeCompare(b.date));
    }
    const t = totals.get(h.id) ?? { year: 0, last30: 0, last7: 0 };
    const allDates = Array.from(allDatesByTask.get(h.id) ?? []);
    const streak = computeHabitStreak(allDates, h.recurrenceInterval, todayStr);
    return {
      id: h.id,
      title: h.title,
      recurrenceInterval: h.recurrenceInterval,
      topicId: h.topicId,
      topicTitle: h.topicTitle ?? null,
      topicColor: h.topicColor ?? null,
      topicIcon: h.topicIcon ?? null,
      completions,
      totalYear: t.year,
      totalLast30: t.last30,
      totalLast7: t.last7,
      streak,
    };
  });
}

/**
 * Returns the list of years the habit page should offer in its year
 * selector: from `max(currentYear - 2, firstCompletionYear)` through the
 * current year, inclusive. Users do not need to browse pre-app years.
 *
 * Implemented as a tiny helper so the page can compute it synchronously
 * from an already-fetched earliest-completion timestamp.
 */
export function buildYearOptions(
  earliestCompletion: Date | null,
  currentYear: number
): number[] {
  const floor = earliestCompletion
    ? Math.min(earliestCompletion.getFullYear(), currentYear)
    : currentYear;
  const start = Math.max(floor, currentYear - 4);
  const years: number[] = [];
  for (let y = currentYear; y >= start; y--) {
    years.push(y);
  }
  return years;
}

/**
 * Fetches the timestamp of the user's very first task completion — used
 * to bound the year selector so users cannot browse empty years before
 * they ever started using the app.
 *
 * @param userId - Authenticated user UUID
 * @returns The Date of the earliest completion, or null if there are none
 */
export async function getEarliestCompletion(
  userId: string
): Promise<Date | null> {
  const rows = await db
    .select({ completedAt: taskCompletions.completedAt })
    .from(taskCompletions)
    .where(eq(taskCompletions.userId, userId))
    .orderBy(asc(taskCompletions.completedAt))
    .limit(1);
  return rows[0]?.completedAt ?? null;
}
