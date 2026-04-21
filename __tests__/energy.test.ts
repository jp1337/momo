/**
 * Integration tests for lib/energy.ts.
 *
 * Covers: recordEnergyCheckin, getEnergyHistory (de-duplicated per day),
 * getEnergyLevelCounts, getEnergyCheckinDayCount, getEnergyCheckinStreak.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import {
  recordEnergyCheckin,
  getEnergyHistory,
  getEnergyLevelCounts,
  getEnergyCheckinDayCount,
  getEnergyCheckinStreak,
} from "@/lib/energy";
import { createTestUser } from "./helpers/fixtures";
import { getLocalDateString, getLocalYesterdayString } from "@/lib/date-utils";

const TZ = "Europe/Berlin";

// ─── recordEnergyCheckin ──────────────────────────────────────────────────────

describe("recordEnergyCheckin", () => {
  it("stores the energy level on the user row", async () => {
    const user = await createTestUser({ timezone: TZ });

    await recordEnergyCheckin(user.id, "HIGH", TZ);

    const [row] = await db
      .select({ energyLevel: users.energyLevel })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row.energyLevel).toBe("HIGH");
  });

  it("appends a row to energy_checkins", async () => {
    const user = await createTestUser({ timezone: TZ });

    await recordEnergyCheckin(user.id, "MEDIUM", TZ);

    const history = await getEnergyHistory(user.id, 7);
    expect(history).toHaveLength(1);
    expect(history[0].level).toBe("MEDIUM");
  });

  it("allows multiple check-ins on the same day", async () => {
    const user = await createTestUser({ timezone: TZ });

    await recordEnergyCheckin(user.id, "HIGH", TZ);
    await recordEnergyCheckin(user.id, "LOW", TZ);

    // getEnergyHistory collapses to latest per day
    const history = await getEnergyHistory(user.id, 7);
    expect(history).toHaveLength(1);
    expect(history[0].level).toBe("LOW"); // latest wins
  });

  it("updates energyLevelDate to today", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);

    await recordEnergyCheckin(user.id, "LOW", TZ);

    const [row] = await db
      .select({ energyLevelDate: users.energyLevelDate })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row.energyLevelDate).toBe(today);
  });
});

// ─── getEnergyHistory ─────────────────────────────────────────────────────────

describe("getEnergyHistory", () => {
  it("returns entries within the window", async () => {
    const user = await createTestUser({ timezone: TZ });

    await recordEnergyCheckin(user.id, "HIGH", TZ);

    const result = await getEnergyHistory(user.id, 7);
    expect(result).toHaveLength(1);
  });

  it("collapses multiple same-day check-ins to the latest", async () => {
    const user = await createTestUser({ timezone: TZ });

    await recordEnergyCheckin(user.id, "HIGH", TZ);
    await recordEnergyCheckin(user.id, "MEDIUM", TZ);
    await recordEnergyCheckin(user.id, "LOW", TZ);

    const result = await getEnergyHistory(user.id, 7);
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe("LOW");
  });

  it("returns empty array when no check-ins exist", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await getEnergyHistory(user.id, 7);
    expect(result).toHaveLength(0);
  });

  it("excludes another user's check-ins", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    await recordEnergyCheckin(userA.id, "HIGH", TZ);

    const result = await getEnergyHistory(userB.id, 7);
    expect(result).toHaveLength(0);
  });
});

// ─── getEnergyLevelCounts ─────────────────────────────────────────────────────

describe("getEnergyLevelCounts", () => {
  it("returns zero counts when no check-ins", async () => {
    const user = await createTestUser({ timezone: TZ });
    const counts = await getEnergyLevelCounts(user.id, 7);
    expect(counts.HIGH).toBe(0);
    expect(counts.MEDIUM).toBe(0);
    expect(counts.LOW).toBe(0);
  });

  it("counts each level once per day", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Two HIGH check-ins today → collapsed to 1 day
    await recordEnergyCheckin(user.id, "HIGH", TZ);
    await recordEnergyCheckin(user.id, "HIGH", TZ);

    const counts = await getEnergyLevelCounts(user.id, 7);
    expect(counts.HIGH).toBe(1);
    expect(counts.LOW).toBe(0);
  });
});

// ─── getEnergyCheckinDayCount ─────────────────────────────────────────────────

describe("getEnergyCheckinDayCount", () => {
  it("returns 0 when no check-ins", async () => {
    const user = await createTestUser({ timezone: TZ });
    const count = await getEnergyCheckinDayCount(user.id);
    expect(count).toBe(0);
  });

  it("counts distinct days — multiple check-ins same day = 1", async () => {
    const user = await createTestUser({ timezone: TZ });

    await recordEnergyCheckin(user.id, "HIGH", TZ);
    await recordEnergyCheckin(user.id, "LOW", TZ);

    const count = await getEnergyCheckinDayCount(user.id);
    expect(count).toBe(1);
  });

  it("isolates by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await recordEnergyCheckin(userA.id, "HIGH", TZ);

    expect(await getEnergyCheckinDayCount(userB.id)).toBe(0);
  });
});

// ─── getEnergyCheckinStreak ───────────────────────────────────────────────────

describe("getEnergyCheckinStreak", () => {
  it("returns 0 when no check-ins exist", async () => {
    const user = await createTestUser({ timezone: TZ });
    const streak = await getEnergyCheckinStreak(user.id, TZ);
    expect(streak).toBe(0);
  });

  it("returns 1 when the user checked in today only", async () => {
    const user = await createTestUser({ timezone: TZ });
    await recordEnergyCheckin(user.id, "HIGH", TZ);

    const streak = await getEnergyCheckinStreak(user.id, TZ);
    expect(streak).toBe(1);
  });

  it("returns 0 when last check-in was yesterday (gap today)", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Manually insert a check-in for yesterday
    const yesterday = getLocalYesterdayString(TZ);
    await db.insert((await import("@/lib/db/schema")).energyCheckins).values({
      userId: user.id,
      date: yesterday,
      energyLevel: "HIGH",
    });

    const streak = await getEnergyCheckinStreak(user.id, TZ);
    // No check-in today → streak breaks at today
    expect(streak).toBe(0);
  });

  it("counts consecutive days including today", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const yesterday = getLocalYesterdayString(TZ);

    // Insert check-ins for today and yesterday
    const { energyCheckins } = await import("@/lib/db/schema");
    await db.insert(energyCheckins).values([
      { userId: user.id, date: yesterday, energyLevel: "HIGH" },
      { userId: user.id, date: today, energyLevel: "MEDIUM" },
    ]);

    const streak = await getEnergyCheckinStreak(user.id, TZ);
    expect(streak).toBe(2);
  });
});
