/**
 * User data export — DSGVO Art. 15/20 (right of access / data portability).
 *
 * Aggregates all personal data belonging to a user into a single structured
 * JSON object suitable for download. OAuth tokens, sessions, and push
 * subscription objects are deliberately excluded (internal/sensitive).
 */

import { db } from "@/lib/db";
import {
  users,
  topics,
  tasks,
  taskCompletions,
  wishlistItems,
  userAchievements,
  achievements,
  notificationLog,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/** Shape of the exported data bundle */
export interface UserDataExport {
  exportedAt: string;
  version: "1";
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    coins: number;
    level: number;
    streakCurrent: number;
    streakMax: number;
    monthlyBudget: string | null;
    notificationEnabled: boolean;
    notificationTime: string;
    theme: string;
    createdAt: Date;
  };
  topics: Array<{
    id: string;
    title: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    priority: string;
    archived: boolean;
    createdAt: Date;
  }>;
  tasks: Array<{
    id: string;
    topicId: string | null;
    title: string;
    notes: string | null;
    type: string;
    priority: string;
    recurrenceInterval: number | null;
    dueDate: string | null;
    nextDueDate: string | null;
    completedAt: Date | null;
    coinValue: number;
    isDailyQuest: boolean;
    createdAt: Date;
  }>;
  taskCompletions: Array<{
    id: string;
    taskId: string;
    completedAt: Date;
  }>;
  wishlistItems: Array<{
    id: string;
    title: string;
    price: string | null;
    url: string | null;
    priority: string;
    status: string;
    coinUnlockThreshold: number | null;
    createdAt: Date;
  }>;
  achievements: Array<{
    key: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: Date;
  }>;
  notificationLog: Array<{
    channel: string;
    title: string;
    body: string | null;
    status: string;
    error: string | null;
    sentAt: Date;
  }>;
}

/**
 * Exports all personal data for a given user.
 *
 * Deliberately excludes:
 *  - pushSubscription (browser-side endpoint, not portable personal data)
 *  - OAuth access/refresh tokens (sensitive, rotated externally)
 *  - Session tokens (transient internal state)
 *
 * @param userId - The authenticated user's UUID
 * @returns A structured UserDataExport object ready for JSON serialization
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  // Run all queries in parallel for performance
  const [
    userRows,
    topicRows,
    taskRows,
    completionRows,
    wishlistRows,
    achievementRows,
    notificationLogRows,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        coins: users.coins,
        level: users.level,
        streakCurrent: users.streakCurrent,
        streakMax: users.streakMax,
        monthlyBudget: users.monthlyBudget,
        notificationEnabled: users.notificationEnabled,
        notificationTime: users.notificationTime,
        theme: users.theme,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),

    db
      .select({
        id: topics.id,
        title: topics.title,
        description: topics.description,
        color: topics.color,
        icon: topics.icon,
        priority: topics.priority,
        archived: topics.archived,
        createdAt: topics.createdAt,
      })
      .from(topics)
      .where(eq(topics.userId, userId)),

    db
      .select({
        id: tasks.id,
        topicId: tasks.topicId,
        title: tasks.title,
        notes: tasks.notes,
        type: tasks.type,
        priority: tasks.priority,
        recurrenceInterval: tasks.recurrenceInterval,
        dueDate: tasks.dueDate,
        nextDueDate: tasks.nextDueDate,
        completedAt: tasks.completedAt,
        coinValue: tasks.coinValue,
        isDailyQuest: tasks.isDailyQuest,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId)),

    db
      .select({
        id: taskCompletions.id,
        taskId: taskCompletions.taskId,
        completedAt: taskCompletions.completedAt,
      })
      .from(taskCompletions)
      .where(eq(taskCompletions.userId, userId)),

    db
      .select({
        id: wishlistItems.id,
        title: wishlistItems.title,
        price: wishlistItems.price,
        url: wishlistItems.url,
        priority: wishlistItems.priority,
        status: wishlistItems.status,
        coinUnlockThreshold: wishlistItems.coinUnlockThreshold,
        createdAt: wishlistItems.createdAt,
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId)),

    db
      .select({
        key: achievements.key,
        title: achievements.title,
        description: achievements.description,
        icon: achievements.icon,
        earnedAt: userAchievements.earnedAt,
      })
      .from(userAchievements)
      .innerJoin(
        achievements,
        eq(userAchievements.achievementId, achievements.id)
      )
      .where(eq(userAchievements.userId, userId)),

    db
      .select({
        channel: notificationLog.channel,
        title: notificationLog.title,
        body: notificationLog.body,
        status: notificationLog.status,
        error: notificationLog.error,
        sentAt: notificationLog.sentAt,
      })
      .from(notificationLog)
      .where(eq(notificationLog.userId, userId))
      .orderBy(desc(notificationLog.sentAt)),
  ]);

  const profile = userRows[0];
  if (!profile) {
    throw new Error("User not found");
  }

  return {
    exportedAt: new Date().toISOString(),
    version: "1",
    profile,
    topics: topicRows,
    tasks: taskRows,
    taskCompletions: completionRows,
    wishlistItems: wishlistRows,
    achievements: achievementRows,
    notificationLog: notificationLogRows,
  };
}
