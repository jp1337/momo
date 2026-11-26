/**
 * User data export — DSGVO Art. 15/20 (right of access / data portability).
 *
 * Exports whole rows of every table that holds the user's data and removes
 * only credentials (see SECRET_COLUMNS). Until version 2 the export picked
 * fields by hand; it did not grow with the schema and left out energy
 * check-ins, quest postponements, notification channels, webhooks, API keys,
 * passkeys, linked accounts, sessions and push devices, plus most newer task
 * and settings columns. `EXPORT_COVERAGE` names every user-owned table and a
 * test fails when a new one is neither exported nor excluded with a reason.
 */

import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  topics,
  tasks,
  taskCompletions,
  energyCheckins,
  wishlistItems,
  userAchievements,
  achievements,
  apiKeys,
  pushSubscriptions,
  questPostponements,
  notificationChannels,
  notificationLog,
  authenticators,
  webhookEndpoints,
  webhookDeliveries,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getServerTranslations } from "@/lib/i18n-server";

/**
 * Every table with a user_id column (by SQL name), and whether the export
 * includes it or why not. Checked by __tests__/export.test.ts.
 */
export const EXPORT_COVERAGE: Record<string, "exported" | string> = {
  users: "exported",
  accounts: "exported",
  sessions: "exported",
  topics: "exported",
  tasks: "exported",
  task_completions: "exported",
  energy_checkins: "exported",
  wishlist_items: "exported",
  user_achievements: "exported",
  api_keys: "exported",
  push_subscriptions: "exported",
  quest_postponements: "exported",
  notification_channels: "exported",
  notification_log: "exported",
  authenticators: "exported",
  webhook_endpoints: "exported",
  webhook_deliveries: "exported",
  linking_requests: "transient: a 5-minute account-linking handshake, deleted after use",
  totp_backup_codes: "credentials only: hashed one-time codes",
};

/** Keys inside notification channel configs that are credentials, not data. */
const CHANNEL_CONFIG_SECRETS = new Set(["botToken", "appToken", "secret", "token", "password"]);

/** Returns `row` without the listed keys. */
function omit<T extends object, K extends keyof T>(row: T, keys: readonly K[]): Omit<T, K> {
  const copy = { ...row };
  for (const k of keys) delete copy[k];
  return copy;
}

/** Credential columns removed from each exported row. */
const SECRET_COLUMNS = {
  users: ["totpSecret", "calendarFeedTokenHash"],
  accounts: ["refresh_token", "access_token", "id_token", "session_state"],
  sessions: ["sessionToken"],
  apiKeys: ["keyHash"],
  pushSubscriptions: ["endpoint", "subscription"],
  authenticators: ["credentialID", "credentialPublicKey"],
  webhookEndpoints: ["secretEncrypted"],
} as const;

/**
 * Exports all personal data for a given user.
 *
 * @param userId - The authenticated user's UUID
 * @returns A JSON-serializable bundle, version "2"
 * @throws Error("User not found") for an unknown id
 */
export async function exportUserData(userId: string) {
  const [
    userRows,
    accountRows,
    sessionRows,
    topicRows,
    taskRows,
    completionRows,
    energyRows,
    wishlistRows,
    achievementRows,
    apiKeyRows,
    pushRows,
    postponementRows,
    channelRows,
    notificationLogRows,
    passkeyRows,
    webhookRows,
    deliveryRows,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(sessions).where(eq(sessions.userId, userId)),
    db.select().from(topics).where(eq(topics.userId, userId)),
    db.select().from(tasks).where(eq(tasks.userId, userId)),
    db.select().from(taskCompletions).where(eq(taskCompletions.userId, userId)),
    db.select().from(energyCheckins).where(eq(energyCheckins.userId, userId)),
    db.select().from(wishlistItems).where(eq(wishlistItems.userId, userId)),
    db
      .select({ key: achievements.key, icon: achievements.icon, earnedAt: userAchievements.earnedAt })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId)),
    db.select().from(apiKeys).where(eq(apiKeys.userId, userId)),
    db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
    db.select().from(questPostponements).where(eq(questPostponements.userId, userId)),
    db.select().from(notificationChannels).where(eq(notificationChannels.userId, userId)),
    db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.userId, userId))
      .orderBy(desc(notificationLog.sentAt)),
    db.select().from(authenticators).where(eq(authenticators.userId, userId)),
    db.select().from(webhookEndpoints).where(eq(webhookEndpoints.userId, userId)),
    db.select().from(webhookDeliveries).where(eq(webhookDeliveries.userId, userId)),
  ]);

  const user = userRows[0];
  if (!user) {
    throw new Error("User not found");
  }

  // Achievement display text lives in messages/*.json, no longer in the DB —
  // resolve it in the exporting user's own language.
  const t = await getServerTranslations(user.locale, "achievements");

  return {
    exportedAt: new Date().toISOString(),
    version: "2" as const,
    profile: {
      ...omit(user, SECRET_COLUMNS.users),
      calendarFeedActive: user.calendarFeedTokenHash !== null,
    },
    linkedAccounts: accountRows.map((r) => omit(r, SECRET_COLUMNS.accounts)),
    sessions: sessionRows.map((r) => omit(r, SECRET_COLUMNS.sessions)),
    topics: topicRows,
    tasks: taskRows,
    taskCompletions: completionRows,
    energyCheckins: energyRows,
    questPostponements: postponementRows,
    wishlistItems: wishlistRows,
    achievements: achievementRows.map((a) => ({
      key: a.key,
      title: t(`catalog.${a.key}.title`),
      description: t(`catalog.${a.key}.description`),
      icon: a.icon,
      earnedAt: a.earnedAt,
    })),
    apiKeys: apiKeyRows.map((r) => omit(r, SECRET_COLUMNS.apiKeys)),
    passkeys: passkeyRows.map((r) => omit(r, SECRET_COLUMNS.authenticators)),
    pushDevices: pushRows.map((r) => omit(r, SECRET_COLUMNS.pushSubscriptions)),
    notificationChannels: channelRows.map((r) => ({
      ...r,
      config: Object.fromEntries(
        Object.entries((r.config ?? {}) as Record<string, unknown>).filter(
          ([k]) => !CHANNEL_CONFIG_SECRETS.has(k),
        ),
      ),
    })),
    notificationLog: notificationLogRows,
    webhookEndpoints: webhookRows.map((r) => ({
      ...omit(r, SECRET_COLUMNS.webhookEndpoints),
      hasSecret: r.secretEncrypted !== null,
    })),
    webhookDeliveries: deliveryRows,
  };
}

/** Shape of the exported data bundle */
export type UserDataExport = Awaited<ReturnType<typeof exportUserData>>;
