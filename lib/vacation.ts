/**
 * Vacation mode business logic.
 *
 * Vacation mode pauses ALL recurring tasks for a date range, preventing
 * habit statistics from being distorted by vacation or illness. On
 * deactivation, `nextDueDate` is shifted forward by the actual pause
 * duration so tasks resume seamlessly.
 *
 * @module lib/vacation
 */

import { db } from "@/lib/db";
import { tasks, users } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { getLocalDateString } from "@/lib/date-utils";
import type { CronJobResult } from "@/lib/cron";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Computes the number of days between two YYYY-MM-DD date strings.
 * Returns a positive number when `to` is after `from`.
 *
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @returns Number of days between the two dates
 */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

/**
 * Adds N days to a YYYY-MM-DD date string.
 *
 * @param dateStr - Base date (YYYY-MM-DD)
 * @param days - Number of days to add
 * @returns Resulting date as YYYY-MM-DD
 */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const result = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = result.getUTCFullYear();
  const mm = String(result.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(result.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns the current vacation mode status for a user.
 *
 * @param userId - The user's UUID
 * @returns Object with `active` flag and optional `endDate`
 */
export async function getVacationStatus(
  userId: string
): Promise<{ active: boolean; endDate: string | null }> {
  const [user] = await db
    .select({ vacationEndDate: users.vacationEndDate })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { active: false, endDate: null };
  }

  return {
    active: user.vacationEndDate !== null,
    endDate: user.vacationEndDate,
  };
}

/**
 * Activates vacation mode for a user.
 *
 * Sets `vacationEndDate` on the user and `pausedAt` + `pausedUntil` on all
 * active RECURRING tasks. If any paused task is the current daily quest,
 * `isDailyQuest` is cleared so a new quest can be selected.
 *
 * @param userId - The user's UUID
 * @param endDate - Vacation end date (YYYY-MM-DD, inclusive)
 * @param timezone - User's IANA timezone (for computing "today")
 */
export async function activateVacationMode(
  userId: string,
  endDate: string,
  timezone?: string | null
): Promise<void> {
  const today = getLocalDateString(timezone);

  await db.transaction(async (tx) => {
    // Set vacation end date on user
    await tx
      .update(users)
      .set({ vacationEndDate: endDate })
      .where(eq(users.id, userId));

    // Pause all active recurring tasks
    await tx
      .update(tasks)
      .set({
        pausedAt: today,
        pausedUntil: endDate,
        isDailyQuest: false,
      })
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.type, "RECURRING"),
          isNull(tasks.completedAt)
        )
      );
  });
}

/**
 * Deactivates vacation mode for a user.
 *
 * For each paused recurring task, shifts `nextDueDate` forward by the actual
 * number of paused days (from `pausedAt` to today). The resulting date is
 * `max(today, nextDueDate + pauseDays)` so tasks are never set to a past date.
 *
 * @param userId - The user's UUID
 * @param timezone - User's IANA timezone (for computing "today")
 */
export async function deactivateVacationMode(
  userId: string,
  timezone?: string | null
): Promise<void> {
  const today = getLocalDateString(timezone);

  await db.transaction(async (tx) => {
    // Fetch all paused recurring tasks
    const pausedTasks = await tx
      .select({
        id: tasks.id,
        pausedAt: tasks.pausedAt,
        nextDueDate: tasks.nextDueDate,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNotNull(tasks.pausedAt),
          isNotNull(tasks.pausedUntil)
        )
      );

    // Shift nextDueDate for each task
    for (const task of pausedTasks) {
      if (task.pausedAt && task.nextDueDate) {
        const pauseDays = daysBetween(task.pausedAt, today);
        if (pauseDays > 0) {
          const shifted = addDays(task.nextDueDate, pauseDays);
          // Never set nextDueDate to a past date
          const newNextDue = shifted >= today ? shifted : today;

          await tx
            .update(tasks)
            .set({
              nextDueDate: newNextDue,
              pausedAt: null,
              pausedUntil: null,
            })
            .where(eq(tasks.id, task.id));
        } else {
          // pauseDays <= 0: deactivated on same day or edge case — just unpause
          await tx
            .update(tasks)
            .set({ pausedAt: null, pausedUntil: null })
            .where(eq(tasks.id, task.id));
        }
      } else {
        // Task has no nextDueDate or pausedAt — just clear pause
        await tx
          .update(tasks)
          .set({ pausedAt: null, pausedUntil: null })
          .where(eq(tasks.id, task.id));
      }
    }

    // Clear vacation end date on user
    await tx
      .update(users)
      .set({ vacationEndDate: null })
      .where(eq(users.id, userId));
  });
}

/**
 * Auto-ends expired vacations. Called by the daily cron job.
 *
 * Finds all users whose `vacationEndDate` has passed (in their local timezone)
 * and calls `deactivateVacationMode` for each.
 *
 * @returns CronJobResult with count of processed users
 */
export async function autoEndVacations(): Promise<CronJobResult> {
  // Fetch all users with an active vacation
  const vacationUsers = await db
    .select({
      id: users.id,
      vacationEndDate: users.vacationEndDate,
      timezone: users.timezone,
    })
    .from(users)
    .where(isNotNull(users.vacationEndDate));

  let sent = 0;
  let failed = 0;

  for (const user of vacationUsers) {
    const today = getLocalDateString(user.timezone);

    // Only end vacation if the end date has passed
    if (user.vacationEndDate && user.vacationEndDate < today) {
      try {
        await deactivateVacationMode(user.id, user.timezone);
        sent++;
      } catch (err) {
        console.error(
          `[vacation] Failed to auto-end vacation for user ${user.id}:`,
          err
        );
        failed++;
      }
    }
  }

  return { sent, failed };
}
