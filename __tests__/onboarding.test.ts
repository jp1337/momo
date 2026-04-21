/**
 * Integration tests for lib/onboarding.ts.
 *
 * Covers: markOnboardingCompleted (sets flag), isOnboardingCompleted
 * (reads flag; defaults to true for unknown userId).
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { markOnboardingCompleted, isOnboardingCompleted } from "@/lib/onboarding";
import { createTestUser } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

async function getOnboardingFlag(userId: string): Promise<boolean | null> {
  const [row] = await db
    .select({ onboardingCompleted: users.onboardingCompleted })
    .from(users)
    .where(eq(users.id, userId));
  return row?.onboardingCompleted ?? null;
}

// ─── markOnboardingCompleted ──────────────────────────────────────────────────

describe("markOnboardingCompleted", () => {
  it("sets onboardingCompleted to true for a new user", async () => {
    const user = await createTestUser({ timezone: TZ });

    await markOnboardingCompleted(user.id);

    expect(await getOnboardingFlag(user.id)).toBe(true);
  });

  it("is idempotent — calling twice leaves flag true", async () => {
    const user = await createTestUser({ timezone: TZ });

    await markOnboardingCompleted(user.id);
    await markOnboardingCompleted(user.id);

    expect(await getOnboardingFlag(user.id)).toBe(true);
  });

  it("does not affect other users", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    await markOnboardingCompleted(userA.id);

    // userB should still have the default (false or null, not true)
    const flagB = await getOnboardingFlag(userB.id);
    expect(flagB).not.toBe(true);
  });
});

// ─── isOnboardingCompleted ────────────────────────────────────────────────────

describe("isOnboardingCompleted", () => {
  it("returns false for a freshly created user", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await isOnboardingCompleted(user.id);
    expect(result).toBe(false);
  });

  it("returns true after markOnboardingCompleted is called", async () => {
    const user = await createTestUser({ timezone: TZ });
    await markOnboardingCompleted(user.id);

    const result = await isOnboardingCompleted(user.id);
    expect(result).toBe(true);
  });

  it("returns true for an unknown userId (safety default)", async () => {
    const result = await isOnboardingCompleted("00000000-0000-0000-0000-000000000000");
    expect(result).toBe(true);
  });
});
