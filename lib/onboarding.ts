/**
 * Onboarding business logic.
 * Manages the one-time guided setup wizard for new users.
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Mark the user's onboarding as completed.
 * Called when the user finishes or skips the onboarding wizard.
 *
 * @param userId - The authenticated user's ID
 */
export async function markOnboardingCompleted(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ onboardingCompleted: true })
    .where(eq(users.id, userId));
}

/**
 * Check whether a user has completed onboarding.
 * Returns true for safety if the user is not found (e.g. race condition).
 *
 * @param userId - The authenticated user's ID
 * @returns Whether onboarding has been completed
 */
export async function isOnboardingCompleted(
  userId: string,
): Promise<boolean> {
  const row = await db
    .select({ onboardingCompleted: users.onboardingCompleted })
    .from(users)
    .where(eq(users.id, userId))
    .then((r) => r[0]);
  return row?.onboardingCompleted ?? true;
}
