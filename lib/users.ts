/**
 * User business logic — account management.
 *
 * All foreign keys referencing `users.id` are configured with
 * `onDelete: "cascade"`, so deleting the user row automatically
 * removes all associated tasks, topics, wishlist items, sessions,
 * OAuth accounts, achievements, and task completions.
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Permanently deletes a user account and all associated data.
 *
 * The cascade is handled entirely by PostgreSQL FK constraints — no
 * manual child-table cleanup is needed. The caller is responsible for
 * signing the user out after this function returns.
 *
 * @param userId - The authenticated user's UUID
 * @throws Error if the user is not found
 */
export async function deleteUser(userId: string): Promise<void> {
  const deleted = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (deleted.length === 0) {
    throw new Error("User not found");
  }
}
