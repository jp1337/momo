/**
 * Gamification logic for Momo.
 *
 * Handles:
 *  - Level definitions and progression
 *  - Achievement definitions and unlock checking
 *  - Streak tracking (daily streak updates)
 *  - Achievement seeding into the database
 *
 * @module lib/gamification
 */

import { db } from "@/lib/db";
import type { Database } from "@/lib/db";
import { users, achievements, userAchievements } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/** A Drizzle transaction or the base db instance — used for transactional operations */
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

// ─── Level System ─────────────────────────────────────────────────────────────

/**
 * Level definitions for the Momo progression system.
 * Titles are in German to match the app's spirit.
 * Each level requires a minimum coin total to reach.
 */
export const LEVELS = [
  { level: 1, title: "Zeitlehrling", minCoins: 0 },
  { level: 2, title: "Aufgabenträger", minCoins: 50 },
  { level: 3, title: "Alltagsmeister", minCoins: 150 },
  { level: 4, title: "Beständiger", minCoins: 300 },
  { level: 5, title: "Zeitwächter", minCoins: 500 },
  { level: 6, title: "Gewohnheitsschmied", minCoins: 800 },
  { level: 7, title: "Routinier", minCoins: 1200 },
  { level: 8, title: "Meister der Stunden", minCoins: 1700 },
  { level: 9, title: "Zeitlenker", minCoins: 2300 },
  { level: 10, title: "Grauer-Herren-Besieger", minCoins: 3000 },
] as const;

/** Type for a single level entry */
export type Level = (typeof LEVELS)[number];

/**
 * Returns the level object for a given coin count.
 * Always returns the highest level the user qualifies for.
 *
 * @param coins - The user's current coin balance
 * @returns The level object matching the coin count
 */
export function getLevelForCoins(coins: number): Level {
  let currentLevel: Level = LEVELS[0];
  for (const levelDef of LEVELS) {
    if (coins >= levelDef.minCoins) {
      currentLevel = levelDef;
    }
  }
  return currentLevel;
}

/**
 * Returns the next level above the current one, or null if at max level.
 *
 * @param currentLevel - The user's current level number (1–10)
 * @returns The next level definition, or null if at max
 */
export function getNextLevel(currentLevel: number): Level | null {
  const next = LEVELS.find((l) => l.level === currentLevel + 1);
  return next ?? null;
}

// ─── Achievement Definitions ──────────────────────────────────────────────────

/**
 * Achievement definitions — key is the unique identifier stored in DB.
 * These are seeded into the achievements table via seedAchievements().
 */
export const ACHIEVEMENT_DEFINITIONS = [
  {
    key: "first_task",
    title: "Erster Schritt",
    description: "Erste Aufgabe erledigt",
    icon: "🌱",
  },
  {
    key: "streak_3",
    title: "Drei am Stück",
    description: "3-Tage-Streak erreicht",
    icon: "🔥",
  },
  {
    key: "streak_7",
    title: "Eine Woche",
    description: "7-Tage-Streak erreicht",
    icon: "⚡",
  },
  {
    key: "streak_30",
    title: "Ein Monat",
    description: "30-Tage-Streak erreicht",
    icon: "💎",
  },
  {
    key: "coins_100",
    title: "Hundert Münzen",
    description: "100 Coins gesammelt",
    icon: "🪙",
  },
  {
    key: "coins_500",
    title: "Halbtausend",
    description: "500 Coins gesammelt",
    icon: "💰",
  },
  {
    key: "level_5",
    title: "Zeitwächter",
    description: "Level 5 erreicht",
    icon: "⭐",
  },
  {
    key: "level_10",
    title: "Legendär",
    description: "Level 10 erreicht",
    icon: "👑",
  },
  {
    key: "first_topic",
    title: "Themensetzer",
    description: "Erstes Topic erstellt",
    icon: "📁",
  },
  {
    key: "tasks_10",
    title: "Fleißige Hände",
    description: "10 Aufgaben erledigt",
    icon: "✋",
  },
  {
    key: "tasks_50",
    title: "Unaufhaltsam",
    description: "50 Aufgaben erledigt",
    icon: "🚀",
  },
  {
    key: "tasks_100",
    title: "Zeitmeister",
    description: "100 Aufgaben erledigt",
    icon: "🏆",
  },
  {
    key: "daily_quest_complete",
    title: "Tagessieger",
    description: "Daily Quest erledigt",
    icon: "🌟",
  },
] as const;

/** Type for a single achievement definition */
export type AchievementDefinition = (typeof ACHIEVEMENT_DEFINITIONS)[number];

/** Type for an unlocked achievement notification */
export interface UnlockedAchievement {
  key: string;
  title: string;
  icon: string;
}

// ─── Context for achievement checking ────────────────────────────────────────

/** Context passed to checkAndUnlockAchievements */
export interface AchievementContext {
  totalCompleted: number;
  streakCurrent: number;
  coins: number;
  level: number;
  isDailyQuestComplete?: boolean;
}

// ─── Streak Logic ─────────────────────────────────────────────────────────────

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

/**
 * Updates user streak after task completion.
 *
 * Logic:
 *  - If streak_last_date is today: no change (already updated today)
 *  - If streak_last_date is yesterday: increment streak_current, update streak_max if needed
 *  - Otherwise: reset streak_current to 1
 * Always sets streak_last_date = today.
 *
 * @param userId - The user's UUID
 * @param tx - Optional Drizzle transaction; uses the global db instance if not provided
 * @returns Updated { streakCurrent, streakMax }
 */
export async function updateStreak(
  userId: string,
  tx?: Tx
): Promise<{ streakCurrent: number; streakMax: number }> {
  const client = tx ?? db;

  const userRows = await client
    .select({
      streakCurrent: users.streakCurrent,
      streakMax: users.streakMax,
      streakLastDate: users.streakLastDate,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    return { streakCurrent: 0, streakMax: 0 };
  }

  const { streakCurrent, streakMax, streakLastDate } = userRows[0];
  const today = getTodayString();

  // Already updated streak today — no change
  if (streakLastDate === today) {
    return { streakCurrent, streakMax };
  }

  // Calculate yesterday's date string
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  let newStreakCurrent: number;

  if (streakLastDate === yesterdayStr) {
    // Continuing streak from yesterday
    newStreakCurrent = streakCurrent + 1;
  } else {
    // Streak broken or first time — reset to 1
    newStreakCurrent = 1;
  }

  const newStreakMax = Math.max(streakMax, newStreakCurrent);

  await client
    .update(users)
    .set({
      streakCurrent: newStreakCurrent,
      streakMax: newStreakMax,
      streakLastDate: today,
    })
    .where(eq(users.id, userId));

  return { streakCurrent: newStreakCurrent, streakMax: newStreakMax };
}

// ─── Achievement Unlock Logic ─────────────────────────────────────────────────

/**
 * Determines which achievement keys should be unlocked given the context.
 *
 * @param context - Current user stats after task completion
 * @returns Array of achievement keys the user qualifies for
 */
function getEarnedAchievementKeys(context: AchievementContext): string[] {
  const earned: string[] = [];

  if (context.totalCompleted >= 1) earned.push("first_task");
  if (context.streakCurrent >= 3) earned.push("streak_3");
  if (context.streakCurrent >= 7) earned.push("streak_7");
  if (context.streakCurrent >= 30) earned.push("streak_30");
  if (context.coins >= 100) earned.push("coins_100");
  if (context.coins >= 500) earned.push("coins_500");
  if (context.level >= 5) earned.push("level_5");
  if (context.level >= 10) earned.push("level_10");
  if (context.totalCompleted >= 10) earned.push("tasks_10");
  if (context.totalCompleted >= 50) earned.push("tasks_50");
  if (context.totalCompleted >= 100) earned.push("tasks_100");
  if (context.isDailyQuestComplete) earned.push("daily_quest_complete");

  return earned;
}

/**
 * Checks and unlocks any achievements the user has earned but not yet received.
 * Called after task completion. Returns array of newly unlocked achievements.
 *
 * @param userId - User to check
 * @param context - { totalCompleted, streakCurrent, coins, level, isDailyQuestComplete? }
 * @param tx - Optional Drizzle transaction; uses the global db instance if not provided
 * @returns Array of newly unlocked achievements (key, title, icon)
 */
export async function checkAndUnlockAchievements(
  userId: string,
  context: AchievementContext,
  tx?: Tx
): Promise<UnlockedAchievement[]> {
  const client = tx ?? db;
  const earnedKeys = getEarnedAchievementKeys(context);
  if (earnedKeys.length === 0) return [];

  // Look up the achievement IDs for those keys
  const achievementRows = await client
    .select({ id: achievements.id, key: achievements.key })
    .from(achievements)
    .where(inArray(achievements.key, earnedKeys));

  if (achievementRows.length === 0) return [];

  const achievementIds = achievementRows.map((a) => a.id);

  // Find which achievements the user already has
  const existingRows = await client
    .select({ achievementId: userAchievements.achievementId })
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, userId),
        inArray(userAchievements.achievementId, achievementIds)
      )
    );

  const existingIds = new Set(existingRows.map((r) => r.achievementId));

  // Filter to newly earned achievements
  const newAchievements = achievementRows.filter(
    (a) => !existingIds.has(a.id)
  );

  if (newAchievements.length === 0) return [];

  // Insert new user_achievements rows
  await client.insert(userAchievements).values(
    newAchievements.map((a) => ({
      userId,
      achievementId: a.id,
    }))
  );

  // Return the achievement details for UI display
  return newAchievements.map((a) => {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.key === a.key);
    return {
      key: a.key,
      title: def?.title ?? a.key,
      icon: def?.icon ?? "🏅",
    };
  });
}

// ─── DB Seeding ───────────────────────────────────────────────────────────────

/**
 * Seeds all ACHIEVEMENT_DEFINITIONS into the achievements table.
 * Uses upsert (on conflict do nothing) so it is safe to call multiple times.
 * Call this once at app startup or via the admin seed API route.
 */
export async function seedAchievements(): Promise<void> {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    await db
      .insert(achievements)
      .values({
        key: def.key,
        title: def.title,
        description: def.description,
        icon: def.icon,
      })
      .onConflictDoNothing();
  }
}
