/**
 * Test database helpers.
 *
 * Uses the same Drizzle singleton (`lib/db`) as production code so that
 * business-logic functions under test hit the same connection pool.
 * The pool is pointed at `momo_test` via the DATABASE_URL injected by
 * vitest.config.ts → test.env.
 */

import { db } from "@/lib/db";
import {
  userAchievements,
  taskCompletions,
  energyCheckins,
  questPostponements,
  notificationLog,
  pushSubscriptions,
  wishlistItems,
  tasks,
  topics,
  accounts,
  sessions,
  apiKeys,
  linkingRequests,
  webhookEndpoints,
  webhookDeliveries,
  users,
} from "@/lib/db/schema";

/**
 * Deletes all user-generated rows from every relevant table, in dependency
 * order (children before parents), so foreign-key constraints are satisfied.
 *
 * Does NOT delete the `achievements` master-data rows that were seeded in
 * global-setup — those are shared across all tests.
 */
export async function resetUserData(): Promise<void> {
  // Walk the FK tree leaves-first so cascades don't cause constraint errors.
  await db.delete(userAchievements);
  await db.delete(taskCompletions);
  await db.delete(energyCheckins);
  await db.delete(questPostponements);
  await db.delete(notificationLog);
  await db.delete(pushSubscriptions);
  await db.delete(wishlistItems);
  await db.delete(tasks);
  await db.delete(topics);
  await db.delete(accounts);
  await db.delete(sessions);
  await db.delete(apiKeys);
  await db.delete(linkingRequests);
  await db.delete(webhookDeliveries);
  await db.delete(webhookEndpoints);
  await db.delete(users);
}
