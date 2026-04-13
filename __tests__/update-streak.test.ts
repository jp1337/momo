/**
 * Integration tests for lib/gamification.ts → updateStreak()
 *
 * Every test runs against a real momo_test PostgreSQL database (no mocks).
 * The DB is reset to a clean state before each test by setup.ts.
 *
 * Scenarios covered:
 *  1. Idempotent — already updated today, no change
 *  2. New user / null last date — starts streak at 1
 *  3. Continuing streak — last date was yesterday → streak +1
 *  4. Reset — gap of 2+ days, no shield → streak resets to 1
 *  5. Shield saves streak — exactly 1 day missed, shield available
 *  6. Shield exhausted — already used this month, streak resets
 *  7. streakMax grows — max is updated when current exceeds previous max
 */

import { describe, it, expect } from "vitest";
import { updateStreak } from "@/lib/gamification";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getLocalDateString,
  getLocalYesterdayString,
  getLocalDayBeforeYesterdayString,
} from "@/lib/date-utils";
import { createTestUser } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

/** Read back the current streak state for a user */
async function getStreakState(userId: string) {
  const [row] = await db
    .select({
      streakCurrent: users.streakCurrent,
      streakMax: users.streakMax,
      streakLastDate: users.streakLastDate,
      streakShieldUsedMonth: users.streakShieldUsedMonth,
    })
    .from(users)
    .where(eq(users.id, userId));
  return row;
}

describe("updateStreak", () => {
  it("is idempotent when streak was already updated today", async () => {
    const today = getLocalDateString(TZ);
    const user = await createTestUser({
      streakCurrent: 5,
      streakMax: 10,
      streakLastDate: today,
    });

    const result = await updateStreak(user.id, undefined, TZ);

    expect(result.streakCurrent).toBe(5);
    expect(result.streakMax).toBe(10);
    expect(result.shieldUsed).toBe(false);

    // DB unchanged
    const state = await getStreakState(user.id);
    expect(state.streakCurrent).toBe(5);
    expect(state.streakLastDate).toBe(today);
  });

  it("starts a new streak for a fresh user with no previous completion", async () => {
    const user = await createTestUser({
      streakCurrent: 0,
      streakLastDate: null,
    });

    const result = await updateStreak(user.id, undefined, TZ);

    expect(result.streakCurrent).toBe(1);
    expect(result.streakMax).toBe(1);
    expect(result.shieldUsed).toBe(false);

    const today = getLocalDateString(TZ);
    const state = await getStreakState(user.id);
    expect(state.streakCurrent).toBe(1);
    expect(state.streakLastDate).toBe(today);
  });

  it("increments the streak when last completion was yesterday", async () => {
    const yesterday = getLocalYesterdayString(TZ);
    const user = await createTestUser({
      streakCurrent: 3,
      streakMax: 5,
      streakLastDate: yesterday,
    });

    const result = await updateStreak(user.id, undefined, TZ);

    expect(result.streakCurrent).toBe(4);
    expect(result.streakMax).toBe(5); // max unchanged (4 < 5)
    expect(result.shieldUsed).toBe(false);

    const state = await getStreakState(user.id);
    expect(state.streakCurrent).toBe(4);
    expect(state.streakLastDate).toBe(getLocalDateString(TZ));
  });

  it("resets to 1 when gap is 2+ days and no shield is available", async () => {
    // 3 days ago — well outside shield range
    const todayStr = getLocalDateString(TZ);
    const [y, m, d] = todayStr.split("-").map(Number);
    const threeDaysAgo = new Date(Date.UTC(y, m - 1, d - 3));
    const threeDaysAgoStr = `${threeDaysAgo.getUTCFullYear()}-${String(threeDaysAgo.getUTCMonth() + 1).padStart(2, "0")}-${String(threeDaysAgo.getUTCDate()).padStart(2, "0")}`;

    const user = await createTestUser({
      streakCurrent: 7,
      streakMax: 7,
      streakLastDate: threeDaysAgoStr,
    });

    const result = await updateStreak(user.id, undefined, TZ);

    expect(result.streakCurrent).toBe(1);
    expect(result.shieldUsed).toBe(false);

    const state = await getStreakState(user.id);
    expect(state.streakCurrent).toBe(1);
    expect(state.streakMax).toBe(7); // max preserved
  });

  it("activates streak shield when exactly one day was missed and shield is available", async () => {
    const dayBeforeYesterday = getLocalDayBeforeYesterdayString(TZ);
    const today = getLocalDateString(TZ);
    const currentMonth = today.slice(0, 7); // "YYYY-MM"

    const user = await createTestUser({
      streakCurrent: 10,
      streakMax: 10,
      streakLastDate: dayBeforeYesterday,
      streakShieldUsedMonth: null, // shield available
    });

    const result = await updateStreak(user.id, undefined, TZ);

    // Shield preserves the streak (no +1, no reset)
    expect(result.streakCurrent).toBe(10);
    expect(result.shieldUsed).toBe(true);

    const state = await getStreakState(user.id);
    expect(state.streakCurrent).toBe(10);
    expect(state.streakShieldUsedMonth).toBe(currentMonth);
  });

  it("does NOT activate shield when it was already used this month", async () => {
    const dayBeforeYesterday = getLocalDayBeforeYesterdayString(TZ);
    const today = getLocalDateString(TZ);
    const currentMonth = today.slice(0, 7);

    const user = await createTestUser({
      streakCurrent: 8,
      streakMax: 8,
      streakLastDate: dayBeforeYesterday,
      streakShieldUsedMonth: currentMonth, // already consumed
    });

    const result = await updateStreak(user.id, undefined, TZ);

    // Shield exhausted → streak resets
    expect(result.streakCurrent).toBe(1);
    expect(result.shieldUsed).toBe(false);
  });

  it("updates streakMax when the new streak surpasses the previous maximum", async () => {
    const yesterday = getLocalYesterdayString(TZ);
    const user = await createTestUser({
      streakCurrent: 5,
      streakMax: 5,
      streakLastDate: yesterday,
    });

    const result = await updateStreak(user.id, undefined, TZ);

    expect(result.streakCurrent).toBe(6);
    expect(result.streakMax).toBe(6); // new max
  });
});
