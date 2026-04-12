/**
 * Energy check-in business logic.
 *
 * Owns the read/write paths for the user's daily energy state and the
 * historical `energy_checkins` table.
 *
 * Why this is a separate module (not part of `lib/daily-quest.ts`):
 *  - The energy data is also consumed by the Stats page, the Quick Wins
 *    sort order, and the 5-Minute Mode — none of which are part of the
 *    daily-quest selection flow.
 *  - Keeping the table CRUD next to the consumers makes it easy to add
 *    further analyses (time-of-day patterns, weekly summaries) without
 *    bloating the daily-quest module.
 *
 * @module lib/energy
 */

import { db } from "@/lib/db";
import { users, energyCheckins } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { getLocalDateString } from "@/lib/date-utils";

/** Three-step energy enum mirrored from the DB. */
export type EnergyLevel = "HIGH" | "MEDIUM" | "LOW";

/** A single historical energy check-in row. */
export interface EnergyCheckin {
  date: string; // YYYY-MM-DD
  level: EnergyLevel;
  createdAt: Date;
}

/** Counts per level for an aggregation window. */
export interface EnergyLevelCounts {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

/**
 * Persists a new energy check-in for the user.
 *
 * Writes to two places at once:
 *   1. `users.energyLevel` + `users.energyLevelDate` — the dashboard cache
 *      that powers the inline check-in card and the daily quest selection.
 *   2. `energy_checkins` — the historical log used by the Stats page.
 *
 * Multiple inserts per user per day are explicitly allowed (re-check-in).
 * Each insert preserves the prior log entries so a "morning HIGH, afternoon
 * LOW" sequence is recoverable.
 *
 * @param userId - Authenticated user UUID
 * @param level - Reported energy level
 * @param timezone - User's IANA timezone (used to compute the local date)
 */
export async function recordEnergyCheckin(
  userId: string,
  level: EnergyLevel,
  timezone?: string | null
): Promise<void> {
  const today = getLocalDateString(timezone);

  await db.transaction(async (tx) => {
    // Update the user-level cache for fast dashboard reads.
    await tx
      .update(users)
      .set({ energyLevel: level, energyLevelDate: today })
      .where(eq(users.id, userId));

    // Append a new log entry — never replaces or de-duplicates.
    await tx.insert(energyCheckins).values({
      userId,
      date: today,
      energyLevel: level,
    });
  });
}

/**
 * Returns the most recent N days of energy check-ins for the user, ordered
 * from oldest to newest. When the user checked in multiple times on the same
 * day, only the latest entry per date is returned (so the daily chart shows
 * one point per day).
 *
 * @param userId - Authenticated user UUID
 * @param days - How many calendar days to look back (e.g. 14 for the
 *   Stats mini-chart)
 */
export async function getEnergyHistory(
  userId: string,
  days: number
): Promise<EnergyCheckin[]> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  const rows = await db
    .select({
      date: energyCheckins.date,
      level: energyCheckins.energyLevel,
      createdAt: energyCheckins.createdAt,
    })
    .from(energyCheckins)
    .where(
      and(
        eq(energyCheckins.userId, userId),
        gte(energyCheckins.createdAt, cutoff)
      )
    )
    .orderBy(energyCheckins.createdAt);

  // Collapse to one entry per local date — keep the LAST check-in per day so
  // a same-day re-check-in (morning HIGH, afternoon LOW) reflects the most
  // recent self-assessment in the daily chart.
  const byDate = new Map<string, EnergyCheckin>();
  for (const row of rows) {
    byDate.set(row.date, {
      date: row.date,
      level: row.level,
      createdAt: row.createdAt,
    });
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Counts how many calendar days in the last `days` window the user reported
 * each energy level (one count per local day, not per check-in).
 *
 * Used by the Stats page weekly block.
 *
 * @param userId - Authenticated user UUID
 * @param days - Window size (e.g. 7 for "this week")
 */
export async function getEnergyLevelCounts(
  userId: string,
  days: number
): Promise<EnergyLevelCounts> {
  const history = await getEnergyHistory(userId, days);
  const counts: EnergyLevelCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const entry of history) {
    counts[entry.level] += 1;
  }
  return counts;
}

/**
 * How many distinct days the user has *ever* checked in.
 * Used by the Stats page to decide whether to show the empty-state hint.
 */
export async function getEnergyCheckinDayCount(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(distinct ${energyCheckins.date})` })
    .from(energyCheckins)
    .where(eq(energyCheckins.userId, userId));
  return Number(rows[0]?.count ?? 0);
}

/**
 * Computes the user's current consecutive energy check-in streak.
 * Counts backwards from today — each day must have at least one check-in.
 * A gap of one or more days without a check-in resets the count.
 *
 * Used by the achievement system to award the "Im Gleichgewicht" badge
 * after 7 consecutive days.
 *
 * @param userId   - Authenticated user UUID
 * @param timezone - IANA timezone used to interpret the local date. Falls back to UTC.
 * @returns Number of consecutive days (including today) with a check-in
 */
export async function getEnergyCheckinStreak(
  userId: string,
  timezone?: string | null
): Promise<number> {
  // Fetch the last 60 days of check-ins — enough to cover any realistic streak
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 60);

  const rows = await db
    .select({ date: energyCheckins.date })
    .from(energyCheckins)
    .where(
      and(
        eq(energyCheckins.userId, userId),
        gte(energyCheckins.createdAt, cutoff)
      )
    );

  // Deduplicate to one entry per date
  const datesWithCheckin = new Set(rows.map((r) => r.date));

  const today = getLocalDateString(timezone);

  // Walk backwards from today counting consecutive days
  let streak = 0;
  const current = new Date(today + "T00:00:00Z");

  while (true) {
    const dateStr = current.toISOString().split("T")[0];
    if (!datesWithCheckin.has(dateStr)) break;
    streak += 1;
    current.setUTCDate(current.getUTCDate() - 1);
  }

  return streak;
}
