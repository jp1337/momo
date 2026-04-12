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
 * For INTERVAL habits a period is a rolling window of `periodDays` days.
 * For WEEKDAY habits a period is a calendar week (Mon–Sun).
 * For MONTHLY habits a period is a calendar month.
 * For YEARLY habits a period is a calendar year.
 *
 * See {@link computeHabitStreak} for the full algorithm and edge cases.
 */
export interface HabitStreak {
  /** Length of the currently running streak in periods. 0 if the last required period was missed. */
  current: number;
  /** Longest streak this habit has ever reached (across all time, not just the requested year). */
  best: number;
  /** Period length in days — `recurrenceInterval ?? 1` for INTERVAL; 7/30/365 for the others. */
  periodDays: number;
}

/** A recurring task with its completion history for a given year. */
export interface HabitWithHistory {
  id: string;
  title: string;
  /** Interval in days between occurrences (null = unspecified, treated as 1) */
  recurrenceInterval: number | null;
  /** Recurrence rule type — determines streak period unit */
  recurrenceType: "INTERVAL" | "WEEKDAY" | "MONTHLY" | "YEARLY";
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
  /** Whether this habit is currently paused (vacation mode). */
  paused: boolean;
  /** End date of the current pause, if any (YYYY-MM-DD). */
  pausedUntil: string | null;
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
 * Converts a YYYY-MM-DD string to a calendar-week index relative to a
 * reference date, counting ISO weeks (Mon–Sun). A higher index means a
 * more recent week; the reference date's week is 0.
 * Negative indices = weeks before the reference.
 *
 * @param iso - YYYY-MM-DD date string
 * @param referenceIso - YYYY-MM-DD reference (today)
 */
function weekIndexFromIsoDate(iso: string, referenceIso: string): number {
  // Day index delta, divided by 7, floored
  const d = dayIndexFromIsoDate(iso);
  const ref = dayIndexFromIsoDate(referenceIso);
  // Align to week start (Mon): shift by JS weekday offset
  const refDate = new Date(ref * 86_400_000);
  const refDow = (refDate.getUTCDay() + 6) % 7; // 0=Mon…6=Sun
  const refWeekStart = ref - refDow;
  const dateWeekStart = d - ((new Date(d * 86_400_000).getUTCDay() + 6) % 7);
  return Math.floor((refWeekStart - dateWeekStart) / 7);
}

/**
 * Converts a YYYY-MM-DD string to a "months ago" index relative to a
 * reference date. 0 = same month as reference, 1 = one month earlier, etc.
 */
function monthIndexFromIsoDate(iso: string, referenceIso: string): number {
  const [ry, rm] = referenceIso.split("-").map(Number);
  const [y, m] = iso.split("-").map(Number);
  return (ry - y) * 12 + (rm - m);
}

/**
 * Converts a YYYY-MM-DD string to a "years ago" index relative to a
 * reference date. 0 = same year, 1 = one year earlier, etc.
 */
function yearIndexFromIsoDate(iso: string, referenceIso: string): number {
  return Number(referenceIso.split("-")[0]) - Number(iso.split("-")[0]);
}

/**
 * Computes the current and best streak for one habit.
 *
 * The period unit depends on `recurrenceType`:
 *  - **INTERVAL** (default/legacy): rolling window of `recurrenceInterval ?? 1` days.
 *  - **WEEKDAY**: calendar weeks (Mon–Sun). Streak = consecutive weeks with ≥ 1 completion.
 *  - **MONTHLY**: calendar months. Streak = consecutive months with ≥ 1 completion.
 *  - **YEARLY**: calendar years. Streak = consecutive years with ≥ 1 completion.
 *
 * **Grace rule** — period 0 (the current period) is never required to be
 * complete yet. If it has no completion, we skip it and count from period 1
 * backwards. This prevents a visual reset at the start of a new week/month.
 *
 * @param completionDates - YYYY-MM-DD completion days in any order. Duplicates tolerated.
 * @param recurrenceInterval - Days for INTERVAL type, `null` → 1.
 * @param today - Today's YYYY-MM-DD in the user's local timezone.
 * @param pausedRanges - Optional paused ranges (vacation mode). Paused periods count as
 *   successful and do not break the streak.
 * @param recurrenceType - Rule type; defaults to "INTERVAL" for backward compat.
 * @returns The current and best streak counted in periods.
 */
export function computeHabitStreak(
  completionDates: string[],
  recurrenceInterval: number | null,
  today: string,
  pausedRanges?: Array<{ from: string; to: string }>,
  recurrenceType: "INTERVAL" | "WEEKDAY" | "MONTHLY" | "YEARLY" = "INTERVAL"
): HabitStreak {
  // ── Calendar-aware branch (WEEKDAY / MONTHLY / YEARLY) ───────────────
  if (recurrenceType === "WEEKDAY" || recurrenceType === "MONTHLY" || recurrenceType === "YEARLY") {
    const periodDays = recurrenceType === "WEEKDAY" ? 7 : recurrenceType === "MONTHLY" ? 30 : 365;

    // Map each completion to a period index (0 = current, larger = older)
    const periodSet = new Set<number>();
    for (const iso of completionDates) {
      let pIdx: number;
      if (recurrenceType === "WEEKDAY") {
        pIdx = weekIndexFromIsoDate(iso, today);
      } else if (recurrenceType === "MONTHLY") {
        pIdx = monthIndexFromIsoDate(iso, today);
      } else {
        pIdx = yearIndexFromIsoDate(iso, today);
      }
      if (pIdx >= 0) periodSet.add(pIdx);
    }

    // Mark paused periods as ok (simple approximation: check if paused range
    // overlaps the period's approximate date window)
    const pausedPeriods = new Set<number>();
    if (pausedRanges && pausedRanges.length > 0) {
      for (const range of pausedRanges) {
        // Find which period indices are covered by the paused range
        const fromPIdx = (() => {
          if (recurrenceType === "WEEKDAY") return weekIndexFromIsoDate(range.from, today);
          if (recurrenceType === "MONTHLY") return monthIndexFromIsoDate(range.from, today);
          return yearIndexFromIsoDate(range.from, today);
        })();
        const toPIdx = (() => {
          if (recurrenceType === "WEEKDAY") return weekIndexFromIsoDate(range.to, today);
          if (recurrenceType === "MONTHLY") return monthIndexFromIsoDate(range.to, today);
          return yearIndexFromIsoDate(range.to, today);
        })();
        const lo = Math.min(fromPIdx, toPIdx);
        const hi = Math.max(fromPIdx, toPIdx);
        for (let k = lo; k <= hi; k++) {
          if (k >= 0) pausedPeriods.add(k);
        }
      }
    }

    const periodOk = (k: number): boolean => periodSet.has(k) || pausedPeriods.has(k);

    if (periodSet.size === 0 && pausedPeriods.size === 0) {
      return { current: 0, best: 0, periodDays };
    }

    // Current streak — grace: skip period 0 if empty
    let current = 0;
    if (periodOk(0)) {
      current = 1;
      let k = 1;
      while (periodOk(k)) { current += 1; k += 1; }
    } else {
      let k = 1;
      while (periodOk(k)) { current += 1; k += 1; }
    }

    // Best streak — max consecutive run
    const allOkPeriods = new Set([...periodSet, ...pausedPeriods]);
    const sorted = Array.from(allOkPeriods).sort((a, b) => a - b);
    let best = sorted.length > 0 ? 1 : 0;
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) { run += 1; if (run > best) best = run; }
      else { run = 1; }
    }
    if (current > best) best = current;

    return { current, best, periodDays };
  }

  // ── Rolling interval branch (INTERVAL) ───────────────────────────────
  const periodDays =
    recurrenceInterval && recurrenceInterval > 0 ? recurrenceInterval : 1;

  // Build a set of period indices that are "paused" — periods whose entire
  // window [today - (k+1)*N + 1, today - k*N] falls within a paused range.
  const pausedPeriods = new Set<number>();
  if (pausedRanges && pausedRanges.length > 0) {
    const todayIdx = dayIndexFromIsoDate(today);
    for (const range of pausedRanges) {
      const fromIdx = dayIndexFromIsoDate(range.from);
      const toIdx = dayIndexFromIsoDate(range.to);
      const maxK = Math.floor((todayIdx - fromIdx) / periodDays);
      const minK = Math.max(0, Math.floor((todayIdx - toIdx) / periodDays));
      for (let k = minK; k <= maxK; k++) {
        const windowEnd = todayIdx - k * periodDays;
        const windowStart = windowEnd - periodDays + 1;
        if (windowStart >= fromIdx && windowEnd <= toIdx) {
          pausedPeriods.add(k);
        }
      }
    }
  }

  /** Returns true if the period has a completion OR is fully paused. */
  const periodOk = (k: number, pSet: Set<number>): boolean =>
    pSet.has(k) || pausedPeriods.has(k);

  if (completionDates.length === 0 && pausedPeriods.size === 0) {
    return { current: 0, best: 0, periodDays };
  }

  const todayIdx = dayIndexFromIsoDate(today);

  const periodSet = new Set<number>();
  for (const iso of completionDates) {
    const d = dayIndexFromIsoDate(iso);
    const pIdx = Math.floor((todayIdx - d) / periodDays);
    if (pIdx >= 0) periodSet.add(pIdx);
  }

  if (periodSet.size === 0 && pausedPeriods.size === 0) {
    return { current: 0, best: 0, periodDays };
  }

  // Current streak
  let current = 0;
  if (periodOk(0, periodSet)) {
    current = 1;
    let k = 1;
    while (periodOk(k, periodSet)) { current += 1; k += 1; }
  } else {
    let k = 1;
    while (periodOk(k, periodSet)) { current += 1; k += 1; }
  }

  // Best streak
  const allOkPeriods = new Set([...periodSet, ...pausedPeriods]);
  const sortedPeriods = Array.from(allOkPeriods).sort((a, b) => a - b);
  let best = sortedPeriods.length > 0 ? 1 : 0;
  let run = 1;
  for (let i = 1; i < sortedPeriods.length; i++) {
    if (sortedPeriods[i] === sortedPeriods[i - 1] + 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
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
      recurrenceType: tasks.recurrenceType,
      topicId: tasks.topicId,
      topicTitle: topics.title,
      topicColor: topics.color,
      topicIcon: topics.icon,
      pausedAt: tasks.pausedAt,
      pausedUntil: tasks.pausedUntil,
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
    // Build paused ranges for streak calculation (current pause only — v1 limitation)
    const pausedRanges: Array<{ from: string; to: string }> = [];
    if (h.pausedAt && h.pausedUntil) {
      pausedRanges.push({ from: h.pausedAt, to: h.pausedUntil });
    }
    const recType = (h.recurrenceType ?? "INTERVAL") as "INTERVAL" | "WEEKDAY" | "MONTHLY" | "YEARLY";
    const streak = computeHabitStreak(allDates, h.recurrenceInterval, todayStr, pausedRanges, recType);
    return {
      id: h.id,
      title: h.title,
      recurrenceInterval: h.recurrenceInterval,
      recurrenceType: recType,
      topicId: h.topicId,
      topicTitle: h.topicTitle ?? null,
      topicColor: h.topicColor ?? null,
      topicIcon: h.topicIcon ?? null,
      completions,
      totalYear: t.year,
      totalLast30: t.last30,
      totalLast7: t.last7,
      streak,
      paused: h.pausedUntil !== null,
      pausedUntil: h.pausedUntil,
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
