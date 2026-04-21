/**
 * Fixture helpers — create minimal valid test records in the database.
 *
 * Every helper accepts an `overrides` object so individual tests can
 * customise exactly the fields relevant to the scenario under test.
 */

import { db } from "@/lib/db";
import { users, topics, tasks, wishlistItems, apiKeys } from "@/lib/db/schema";
import { getLocalDateString } from "@/lib/date-utils";
import { createHash, randomBytes } from "crypto";

// ─── Users ────────────────────────────────────────────────────────────────────

export interface TestUserOverrides {
  timezone?: string | null;
  coins?: number;
  level?: number;
  streakCurrent?: number;
  streakMax?: number;
  streakLastDate?: string | null;
  streakShieldUsedMonth?: string | null;
  questStreakCurrent?: number;
  questStreakLastDate?: string | null;
  energyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
  totalTasksCreated?: number;
}

/**
 * Inserts a test user with sensible defaults and returns the inserted row.
 * The user has no OAuth accounts or sessions (not needed for lib function tests).
 */
export async function createTestUser(
  overrides: TestUserOverrides = {}
): Promise<typeof users.$inferSelect> {
  const [user] = await db
    .insert(users)
    .values({
      name: "Test User",
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      timezone: overrides.timezone ?? "Europe/Berlin",
      coins: overrides.coins ?? 0,
      level: overrides.level ?? 1,
      streakCurrent: overrides.streakCurrent ?? 0,
      streakMax: overrides.streakMax ?? 0,
      streakLastDate: overrides.streakLastDate ?? null,
      streakShieldUsedMonth: overrides.streakShieldUsedMonth ?? null,
      questStreakCurrent: overrides.questStreakCurrent ?? 0,
      questStreakLastDate: overrides.questStreakLastDate ?? null,
      energyLevel: overrides.energyLevel ?? null,
    })
    .returning();

  return user;
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export interface TestTopicOverrides {
  title?: string;
  icon?: string;
  color?: string;
  sequential?: boolean;
  defaultEnergyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
}

/**
 * Inserts a test topic belonging to the given user.
 */
export async function createTestTopic(
  userId: string,
  overrides: TestTopicOverrides = {}
): Promise<typeof topics.$inferSelect> {
  const [topic] = await db
    .insert(topics)
    .values({
      userId,
      title: overrides.title ?? "Test Topic",
      icon: overrides.icon ?? "faFolder",
      color: overrides.color ?? "#4a7c59",
      sequential: overrides.sequential ?? false,
      defaultEnergyLevel: overrides.defaultEnergyLevel ?? null,
    })
    .returning();

  return topic;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface TestTaskOverrides {
  topicId?: string | null;
  title?: string;
  type?: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority?: "HIGH" | "NORMAL" | "SOMEDAY";
  coinValue?: number;
  isDailyQuest?: boolean;
  dailyQuestDate?: string | null;
  completedAt?: Date | null;
  dueDate?: string | null;
  nextDueDate?: string | null;
  snoozedUntil?: string | null;
  pausedUntil?: string | null;
  pausedAt?: string | null;
  energyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
  postponeCount?: number;
  recurrenceInterval?: number;
  recurrenceType?: "INTERVAL" | "WEEKDAY" | "MONTHLY" | "YEARLY";
  recurrenceWeekdays?: string;
  recurrenceFixed?: boolean;
  sortOrder?: number;
}

/**
 * Inserts a ONE_TIME test task belonging to the given user.
 */
export async function createTestTask(
  userId: string,
  overrides: TestTaskOverrides = {}
): Promise<typeof tasks.$inferSelect> {
  const [task] = await db
    .insert(tasks)
    .values({
      userId,
      topicId: overrides.topicId ?? null,
      title: overrides.title ?? "Test Task",
      type: overrides.type ?? "ONE_TIME",
      priority: overrides.priority ?? "NORMAL",
      coinValue: overrides.coinValue ?? 1,
      isDailyQuest: overrides.isDailyQuest ?? false,
      dailyQuestDate: overrides.dailyQuestDate ?? null,
      completedAt: overrides.completedAt ?? null,
      dueDate: overrides.dueDate ?? null,
      nextDueDate: overrides.nextDueDate ?? null,
      snoozedUntil: overrides.snoozedUntil ?? null,
      pausedUntil: overrides.pausedUntil ?? null,
      pausedAt: overrides.pausedAt ?? null,
      energyLevel: overrides.energyLevel ?? null,
      postponeCount: overrides.postponeCount ?? 0,
      recurrenceInterval: overrides.recurrenceInterval ?? 1,
      recurrenceType: overrides.recurrenceType ?? "INTERVAL",
      recurrenceWeekdays: overrides.recurrenceWeekdays ?? null,
      recurrenceFixed: overrides.recurrenceFixed ?? false,
      sortOrder: overrides.sortOrder ?? 0,
    })
    .returning();

  return task;
}

/**
 * Inserts a RECURRING test task with nextDueDate defaulting to today.
 * @param userId - The user this task belongs to
 * @param overrides - Field overrides; pass `timezone` to set the local "today"
 */
export async function createTestRecurringTask(
  userId: string,
  overrides: TestTaskOverrides & { timezone?: string } = {}
): Promise<typeof tasks.$inferSelect> {
  const { timezone, ...taskOverrides } = overrides;
  const today = getLocalDateString(timezone ?? "Europe/Berlin");
  return createTestTask(userId, {
    type: "RECURRING",
    nextDueDate: today,
    recurrenceInterval: 1,
    ...taskOverrides,
  });
}

// ─── Wishlist Items ───────────────────────────────────────────────────────────

export interface TestWishlistItemOverrides {
  title?: string;
  price?: string | null;
  url?: string | null;
  priority?: "WANT" | "NICE_TO_HAVE" | "SOMEDAY";
  status?: "OPEN" | "BOUGHT" | "DISCARDED";
  coinUnlockThreshold?: number | null;
}

/**
 * Inserts a test wishlist item belonging to the given user.
 */
export async function createTestWishlistItem(
  userId: string,
  overrides: TestWishlistItemOverrides = {}
): Promise<typeof wishlistItems.$inferSelect> {
  const [item] = await db
    .insert(wishlistItems)
    .values({
      userId,
      title: overrides.title ?? "Test Item",
      price: overrides.price ?? null,
      url: overrides.url ?? null,
      priority: overrides.priority ?? "WANT",
      status: overrides.status ?? "OPEN",
      coinUnlockThreshold: overrides.coinUnlockThreshold ?? null,
    })
    .returning();
  return item;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface TestApiKeyOverrides {
  name?: string;
  readonly?: boolean;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}

/**
 * Inserts a test API key directly into the DB and returns the plaintext key
 * alongside the DB record. Use when you need a key without going through
 * createApiKey() (e.g. for testing resolveApiKeyUser edge cases).
 */
export async function createTestApiKey(
  userId: string,
  overrides: TestApiKeyOverrides = {}
): Promise<{ plaintext: string; record: typeof apiKeys.$inferSelect }> {
  const raw = randomBytes(32);
  const plaintext = `momo_live_${raw.toString("base64url")}`;
  const keyHash = createHash("sha256").update(plaintext).digest("hex");
  const keyPrefix = plaintext.slice(0, 16) + "...";

  const [record] = await db
    .insert(apiKeys)
    .values({
      userId,
      name: overrides.name ?? "Test Key",
      keyHash,
      keyPrefix,
      readonly: overrides.readonly ?? false,
      expiresAt: overrides.expiresAt ?? null,
      revokedAt: overrides.revokedAt ?? null,
    })
    .returning();

  return { plaintext, record };
}
