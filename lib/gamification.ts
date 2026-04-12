/**
 * Gamification logic for Momo.
 *
 * Handles:
 *  - Level definitions and progression
 *  - Achievement definitions (31 achievements, 4 rarity tiers, 3 secret) and unlock checking
 *  - Streak tracking (daily streak + daily quest streak updates)
 *  - Achievement seeding into the database
 *  - Coin rewards for achievement unlocks
 *
 * @module lib/gamification
 */

import { db } from "@/lib/db";
import type { Database } from "@/lib/db";
import { users, achievements, userAchievements } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getLocalDateString, getLocalYesterdayString, getLocalDayBeforeYesterdayString } from "@/lib/date-utils";

// ─── User Stats ───────────────────────────────────────────────────────────────

/**
 * Returns dashboard stats for a user: coin balance, streak, and level.
 *
 * @param userId - The user's UUID
 * @returns Object with coins, streakCurrent, level fields (or defaults if user not found)
 */
export async function getUserStats(userId: string): Promise<{
  coins: number;
  streakCurrent: number;
  level: number;
  streakShieldAvailable: boolean;
}> {
  const userRows = await db
    .select({
      coins: users.coins,
      streakCurrent: users.streakCurrent,
      level: users.level,
      streakShieldUsedMonth: users.streakShieldUsedMonth,
      timezone: users.timezone,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    return { coins: 0, streakCurrent: 0, level: 1, streakShieldAvailable: true };
  }

  const { streakShieldUsedMonth, timezone, ...rest } = userRows[0];
  const currentMonth = getLocalDateString(timezone).slice(0, 7);

  return {
    ...rest,
    streakShieldAvailable: streakShieldUsedMonth !== currentMonth,
  };
}

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
 * All 31 achievement definitions.
 *
 * Rarity tiers and their coin rewards:
 *  - common    →  10 coins  (first-time milestones, easily reached)
 *  - rare      →  25 coins  (consistency & early progression)
 *  - epic      →  50 coins  (sustained effort, mid-game milestones)
 *  - legendary → 100 coins  (long-term dedication, extreme milestones)
 *
 * Secret achievements (secret: true) are displayed as "???" until earned.
 * These are seeded into the DB via seedAchievements().
 */
export const ACHIEVEMENT_DEFINITIONS = [
  // ── Common ────────────────────────────────────────────────────────────────
  {
    key: "first_task",
    title: "Erster Schritt",
    description: "Erste Aufgabe erledigt",
    icon: "🌱",
    rarity: "common" as const,
    coinReward: 10,
  },
  {
    key: "daily_quest_complete",
    title: "Tagessieger",
    description: "Daily Quest erledigt",
    icon: "🌟",
    rarity: "common" as const,
    coinReward: 10,
  },
  {
    key: "first_topic",
    title: "Themensetzer",
    description: "Erstes Topic erstellt",
    icon: "📁",
    rarity: "common" as const,
    coinReward: 10,
  },
  {
    key: "first_high_priority",
    title: "Volles Risiko",
    description: "Erste Aufgabe mit hoher Priorität erledigt",
    icon: "❗",
    rarity: "common" as const,
    coinReward: 10,
  },
  {
    key: "first_wishlist_buy",
    title: "Erster Wunsch",
    description: "Erstes Wunschlisten-Item gekauft",
    icon: "🛍️",
    rarity: "common" as const,
    coinReward: 10,
  },
  // ── Rare ─────────────────────────────────────────────────────────────────
  {
    key: "streak_3",
    title: "Drei am Stück",
    description: "3-Tage-Streak erreicht",
    icon: "🔥",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "streak_7",
    title: "Eine Woche",
    description: "7-Tage-Streak erreicht",
    icon: "⚡",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "streak_14",
    title: "Zwei Wochen",
    description: "14-Tage-Streak erreicht",
    icon: "🌙",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "tasks_10",
    title: "Fleißige Hände",
    description: "10 Aufgaben erledigt",
    icon: "✋",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "tasks_50",
    title: "Unaufhaltsam",
    description: "50 Aufgaben erledigt",
    icon: "🚀",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "coins_100",
    title: "Hundert Münzen",
    description: "100 Coins gesammelt",
    icon: "🪙",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "level_5",
    title: "Zeitwächter",
    description: "Level 5 erreicht",
    icon: "⭐",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "quest_streak_7",
    title: "Wochensieger",
    description: "7 Tage Daily Quest in Folge erledigt",
    icon: "🎯",
    rarity: "rare" as const,
    coinReward: 25,
  },
  {
    key: "energy_checkin_7",
    title: "Im Gleichgewicht",
    description: "7 Tage in Folge Energie eingecheckt",
    icon: "🧘",
    rarity: "rare" as const,
    coinReward: 25,
  },
  // ── Epic ──────────────────────────────────────────────────────────────────
  {
    key: "streak_30",
    title: "Ein Monat",
    description: "30-Tage-Streak erreicht",
    icon: "💎",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "streak_60",
    title: "Zwei Monate",
    description: "60-Tage-Streak erreicht",
    icon: "🌊",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "tasks_100",
    title: "Zeitmeister",
    description: "100 Aufgaben erledigt",
    icon: "🏆",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "tasks_200",
    title: "Beständig",
    description: "200 Aufgaben erledigt",
    icon: "🎖️",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "coins_500",
    title: "Halbtausend",
    description: "500 Coins gesammelt",
    icon: "💰",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "level_10",
    title: "Legendär",
    description: "Level 10 erreicht",
    icon: "👑",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "topics_5",
    title: "Themenmeister",
    description: "5 Topics erstellt",
    icon: "📚",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "quest_streak_30",
    title: "Monatssieger",
    description: "30 Tage Daily Quest in Folge erledigt",
    icon: "🏅",
    rarity: "epic" as const,
    coinReward: 50,
  },
  {
    key: "wishlist_10_bought",
    title: "Wunscherfüller",
    description: "10 Wunschlisten-Items gekauft",
    icon: "🎁",
    rarity: "epic" as const,
    coinReward: 50,
  },
  // ── Legendary ─────────────────────────────────────────────────────────────
  {
    key: "streak_100",
    title: "Unbeugsamkeit",
    description: "100-Tage-Streak erreicht",
    icon: "💪",
    rarity: "legendary" as const,
    coinReward: 100,
  },
  {
    key: "streak_365",
    title: "Ein Jahr",
    description: "365-Tage-Streak erreicht",
    icon: "🌠",
    rarity: "legendary" as const,
    coinReward: 100,
  },
  {
    key: "tasks_500",
    title: "Ausdauerkämpfer",
    description: "500 Aufgaben erledigt",
    icon: "⚔️",
    rarity: "legendary" as const,
    coinReward: 100,
  },
  {
    key: "tasks_1000",
    title: "Tausendster",
    description: "1000 Aufgaben erledigt",
    icon: "👾",
    rarity: "legendary" as const,
    coinReward: 100,
  },
  {
    key: "first_sequential_topic",
    title: "Stratege",
    description: "Erstes sequenzielles Topic erstellt",
    icon: "🧭",
    rarity: "legendary" as const,
    coinReward: 100,
  },
  // ── Secret ────────────────────────────────────────────────────────────────
  {
    key: "night_owl",
    title: "Nachtaktiv",
    description: "Eine Aufgabe nach 23 Uhr erledigt",
    icon: "🦉",
    rarity: "rare" as const,
    coinReward: 25,
    secret: true,
  },
  {
    key: "early_bird",
    title: "Frühaufsteher",
    description: "Eine Aufgabe vor 7 Uhr erledigt",
    icon: "🐦",
    rarity: "rare" as const,
    coinReward: 25,
    secret: true,
  },
  {
    key: "double_shift",
    title: "Doppelschicht",
    description: "Zwei Daily Quests an einem Tag erledigt",
    icon: "⚡",
    rarity: "epic" as const,
    coinReward: 50,
    secret: true,
  },
] as const;

/** Type for a single achievement definition */
export type AchievementDefinition = {
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  coinReward: number;
  secret?: boolean;
};

/** Type for an unlocked achievement notification */
export interface UnlockedAchievement {
  key: string;
  title: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  coinReward: number;
}

/** Result returned by checkAndUnlockAchievements */
export interface AchievementResult {
  /** Newly unlocked achievements for UI display */
  unlocked: UnlockedAchievement[];
  /** Total coins to award the user for all newly unlocked achievements */
  coinsAwarded: number;
}

// ─── Context for achievement checking ────────────────────────────────────────

/**
 * Context passed to checkAndUnlockAchievements.
 * All fields beyond the first four are optional — callers only populate
 * what is relevant to their trigger point.
 */
export interface AchievementContext {
  totalCompleted: number;
  streakCurrent: number;
  coins: number;
  level: number;
  isDailyQuestComplete?: boolean;
  /** Current quest streak after update (for quest_streak_7/30) */
  questStreakCurrent?: number;
  /** Local hour of completion (0–23) — for night_owl / early_bird secret achievements */
  completionHour?: number;
  /** How many daily quests were completed today — for double_shift secret achievement */
  dailyQuestCompletionsToday?: number;
  /** Total number of topics the user has created */
  topicsCreated?: number;
  /** Whether the user has at least one sequential topic */
  hasSequentialTopic?: boolean;
  /** Total completed tasks with HIGH priority */
  totalHighPriorityCompleted?: number;
  /** Total wishlist items the user has bought */
  totalWishlistBought?: number;
  /** Consecutive days with at least one energy check-in */
  energyCheckinStreak?: number;
}

// ─── Streak Logic ─────────────────────────────────────────────────────────────

/**
 * Updates user streak after task completion.
 *
 * Uses the user's local timezone so a completion at 23:50 in UTC+2 is
 * credited to the correct local day, not the next UTC day.
 *
 * Logic:
 *  - If streak_last_date is today (in user's timezone): no change
 *  - If streak_last_date is yesterday (in user's timezone): increment streak
 *  - If streak_last_date is day-before-yesterday AND streak shield is available: preserve streak (shield consumed)
 *  - Otherwise: reset streak to 1
 * Always sets streak_last_date = today in the user's timezone.
 *
 * The streak shield protects the user's streak once per calendar month when
 * exactly one day was missed. Multi-day gaps still reset the streak.
 *
 * @param userId   - The user's UUID
 * @param tx       - Optional Drizzle transaction
 * @param timezone - IANA timezone (e.g. "Europe/Berlin"). Falls back to UTC.
 * @returns Updated { streakCurrent, streakMax, shieldUsed }
 */
export async function updateStreak(
  userId: string,
  tx?: Tx,
  timezone?: string | null
): Promise<{ streakCurrent: number; streakMax: number; shieldUsed: boolean }> {
  const client = tx ?? db;

  const userRows = await client
    .select({
      streakCurrent: users.streakCurrent,
      streakMax: users.streakMax,
      streakLastDate: users.streakLastDate,
      streakShieldUsedMonth: users.streakShieldUsedMonth,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    return { streakCurrent: 0, streakMax: 0, shieldUsed: false };
  }

  const { streakCurrent, streakMax, streakLastDate, streakShieldUsedMonth } = userRows[0];
  const today = getLocalDateString(timezone);
  const yesterday = getLocalYesterdayString(timezone);

  // Already updated streak today (in user's timezone) — no change
  if (streakLastDate === today) {
    return { streakCurrent, streakMax, shieldUsed: false };
  }

  let newStreakCurrent: number;
  let shieldActivated = false;

  if (streakLastDate === yesterday) {
    // Continuing streak from yesterday
    newStreakCurrent = streakCurrent + 1;
  } else {
    // Gap detected — check if streak shield can save it
    const dayBeforeYesterday = getLocalDayBeforeYesterdayString(timezone);
    const currentMonth = today.slice(0, 7); // "YYYY-MM"

    if (
      streakCurrent > 0 &&
      streakLastDate === dayBeforeYesterday &&
      streakShieldUsedMonth !== currentMonth
    ) {
      // Shield: exactly 1 day missed, shield available → preserve streak
      newStreakCurrent = streakCurrent;
      shieldActivated = true;
    } else {
      // Streak broken or first completion — reset to 1
      newStreakCurrent = 1;
    }
  }

  const newStreakMax = Math.max(streakMax, newStreakCurrent);

  await client
    .update(users)
    .set({
      streakCurrent: newStreakCurrent,
      streakMax: newStreakMax,
      streakLastDate: today,
      ...(shieldActivated ? { streakShieldUsedMonth: today.slice(0, 7) } : {}),
    })
    .where(eq(users.id, userId));

  return { streakCurrent: newStreakCurrent, streakMax: newStreakMax, shieldUsed: shieldActivated };
}

/**
 * Updates the user's daily quest streak after completing a daily quest.
 *
 * Similar to updateStreak but tracks only daily quest completions (not all tasks).
 * No shield mechanism — quest streaks reset on any missed day.
 *
 * Logic:
 *  - If quest_streak_last_date is today: no change (already counted)
 *  - If quest_streak_last_date is yesterday: increment
 *  - Otherwise: reset to 1
 *
 * @param userId   - The user's UUID
 * @param timezone - IANA timezone string. Falls back to UTC.
 * @returns Updated { questStreakCurrent }
 */
export async function updateQuestStreak(
  userId: string,
  timezone?: string | null
): Promise<{ questStreakCurrent: number }> {
  const userRows = await db
    .select({
      questStreakCurrent: users.questStreakCurrent,
      questStreakLastDate: users.questStreakLastDate,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    return { questStreakCurrent: 0 };
  }

  const { questStreakCurrent, questStreakLastDate } = userRows[0];
  const today = getLocalDateString(timezone);
  const yesterday = getLocalYesterdayString(timezone);

  // Already updated quest streak today — no change
  if (questStreakLastDate === today) {
    return { questStreakCurrent };
  }

  const newQuestStreakCurrent =
    questStreakLastDate === yesterday ? questStreakCurrent + 1 : 1;

  await db
    .update(users)
    .set({
      questStreakCurrent: newQuestStreakCurrent,
      questStreakLastDate: today,
    })
    .where(eq(users.id, userId));

  return { questStreakCurrent: newQuestStreakCurrent };
}

// ─── Achievement Unlock Logic ─────────────────────────────────────────────────

/**
 * Determines which achievement keys should be unlocked given the context.
 *
 * @param context - Current user stats after task completion or other trigger
 * @returns Array of achievement keys the user qualifies for
 */
function getEarnedAchievementKeys(context: AchievementContext): string[] {
  const earned: string[] = [];

  // ── Task count milestones ──────────────────────────────────────────────────
  if (context.totalCompleted >= 1) earned.push("first_task");
  if (context.totalCompleted >= 10) earned.push("tasks_10");
  if (context.totalCompleted >= 50) earned.push("tasks_50");
  if (context.totalCompleted >= 100) earned.push("tasks_100");
  if (context.totalCompleted >= 200) earned.push("tasks_200");
  if (context.totalCompleted >= 500) earned.push("tasks_500");
  if (context.totalCompleted >= 1000) earned.push("tasks_1000");

  // ── Streak milestones ─────────────────────────────────────────────────────
  if (context.streakCurrent >= 3) earned.push("streak_3");
  if (context.streakCurrent >= 7) earned.push("streak_7");
  if (context.streakCurrent >= 14) earned.push("streak_14");
  if (context.streakCurrent >= 30) earned.push("streak_30");
  if (context.streakCurrent >= 60) earned.push("streak_60");
  if (context.streakCurrent >= 100) earned.push("streak_100");
  if (context.streakCurrent >= 365) earned.push("streak_365");

  // ── Coin milestones ───────────────────────────────────────────────────────
  if (context.coins >= 100) earned.push("coins_100");
  if (context.coins >= 500) earned.push("coins_500");

  // ── Level milestones ──────────────────────────────────────────────────────
  if (context.level >= 5) earned.push("level_5");
  if (context.level >= 10) earned.push("level_10");

  // ── Daily quest ───────────────────────────────────────────────────────────
  if (context.isDailyQuestComplete) earned.push("daily_quest_complete");

  // ── Quest streak ──────────────────────────────────────────────────────────
  if ((context.questStreakCurrent ?? 0) >= 7) earned.push("quest_streak_7");
  if ((context.questStreakCurrent ?? 0) >= 30) earned.push("quest_streak_30");

  // ── Topics ────────────────────────────────────────────────────────────────
  if ((context.topicsCreated ?? 0) >= 1) earned.push("first_topic");
  if ((context.topicsCreated ?? 0) >= 5) earned.push("topics_5");
  if (context.hasSequentialTopic) earned.push("first_sequential_topic");

  // ── High priority ─────────────────────────────────────────────────────────
  if ((context.totalHighPriorityCompleted ?? 0) >= 1) earned.push("first_high_priority");

  // ── Wishlist ──────────────────────────────────────────────────────────────
  if ((context.totalWishlistBought ?? 0) >= 1) earned.push("first_wishlist_buy");
  if ((context.totalWishlistBought ?? 0) >= 10) earned.push("wishlist_10_bought");

  // ── Energy check-in ───────────────────────────────────────────────────────
  if ((context.energyCheckinStreak ?? 0) >= 7) earned.push("energy_checkin_7");

  // ── Secret achievements ───────────────────────────────────────────────────
  if (context.completionHour !== undefined && context.completionHour >= 23) {
    earned.push("night_owl");
  }
  if (context.completionHour !== undefined && context.completionHour < 7) {
    earned.push("early_bird");
  }
  if ((context.dailyQuestCompletionsToday ?? 0) >= 2) {
    earned.push("double_shift");
  }

  return earned;
}

/**
 * Checks and unlocks any achievements the user has earned but not yet received.
 * Returns newly unlocked achievements and the total coins to award.
 *
 * Callers are responsible for booking `coinsAwarded` into the user's balance —
 * this function only inserts the user_achievements rows.
 *
 * @param userId  - User to check
 * @param context - Stats context (totalCompleted, streakCurrent, coins, level, …)
 * @param tx      - Optional Drizzle transaction; uses the global db instance if not provided
 * @returns { unlocked: newly unlocked achievements, coinsAwarded: total coins to book }
 */
export async function checkAndUnlockAchievements(
  userId: string,
  context: AchievementContext,
  tx?: Tx
): Promise<AchievementResult> {
  const client = tx ?? db;
  const earnedKeys = getEarnedAchievementKeys(context);
  if (earnedKeys.length === 0) return { unlocked: [], coinsAwarded: 0 };

  // Look up the achievement IDs + metadata for those keys
  const achievementRows = await client
    .select({
      id: achievements.id,
      key: achievements.key,
      rarity: achievements.rarity,
      coinReward: achievements.coinReward,
    })
    .from(achievements)
    .where(inArray(achievements.key, earnedKeys));

  if (achievementRows.length === 0) return { unlocked: [], coinsAwarded: 0 };

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

  if (newAchievements.length === 0) return { unlocked: [], coinsAwarded: 0 };

  // Insert new user_achievements rows
  await client.insert(userAchievements).values(
    newAchievements.map((a) => ({
      userId,
      achievementId: a.id,
    }))
  );

  // Build the result with full definition metadata
  const unlocked: UnlockedAchievement[] = newAchievements.map((a) => {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.key === a.key);
    const rarity = (a.rarity as "common" | "rare" | "epic" | "legendary") ?? "common";
    return {
      key: a.key,
      title: def?.title ?? a.key,
      icon: def?.icon ?? "🏅",
      rarity,
      coinReward: a.coinReward ?? def?.coinReward ?? 10,
    };
  });

  const coinsAwarded = unlocked.reduce((sum, a) => sum + a.coinReward, 0);

  return { unlocked, coinsAwarded };
}

// ─── DB Seeding ───────────────────────────────────────────────────────────────

/**
 * Seeds all ACHIEVEMENT_DEFINITIONS into the achievements table.
 * Uses upsert (on conflict update) so it is safe to call multiple times —
 * existing achievements are updated with the latest rarity/coinReward/secret values.
 * Call this once at app startup or via the admin seed API route.
 */
export async function seedAchievements(): Promise<void> {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const d = def as AchievementDefinition;
    await db
      .insert(achievements)
      .values({
        key: d.key,
        title: d.title,
        description: d.description,
        icon: d.icon,
        rarity: d.rarity,
        coinReward: d.coinReward,
        secret: d.secret ?? false,
      })
      .onConflictDoUpdate({
        target: achievements.key,
        set: {
          title: d.title,
          description: d.description,
          icon: d.icon,
          rarity: d.rarity,
          coinReward: d.coinReward,
          secret: d.secret ?? false,
        },
      });
  }
}
