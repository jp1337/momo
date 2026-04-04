/**
 * Statistics business logic for Momo.
 *
 * Provides two main data-fetching functions:
 *  - getUserStatistics: Full stats for a single authenticated user
 *  - getAdminStatistics: Aggregate platform stats for admin users
 *
 * All queries use Drizzle ORM. Parallel queries are fired with Promise.all
 * to minimise latency.
 *
 * @module lib/statistics
 */

import { db } from "@/lib/db";
import {
  users,
  tasks,
  taskCompletions,
  topics,
  achievements,
  userAchievements,
  wishlistItems,
  accounts,
} from "@/lib/db/schema";
import {
  count,
  desc,
  gte,
  and,
  eq,
  isNotNull,
  sql,
  avg,
} from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Full statistics object for a single user.
 */
export interface UserStatistics {
  /** Total tasks created by the user (all types, all statuses) */
  totalTasksCreated: number;
  /** Tasks that are not yet completed (completedAt IS NULL) */
  openTasks: number;
  /** ONE_TIME tasks that have completedAt set */
  completedTasks: number;
  /** Total entries in task_completions (includes recurring completions) */
  totalCompletions: number;
  /** Completions in the last 7 days */
  completionsLast7Days: number;
  /** Completions in the last 30 days */
  completionsLast30Days: number;
  /** Total topics owned by the user (including archived) */
  totalTopics: number;
  /** User's current coin balance */
  coins: number;
  /** User's current level */
  level: number;
  /** User's current streak in days */
  streakCurrent: number;
  /** User's all-time best streak */
  streakMax: number;
  /** Date the user's account was created */
  memberSince: Date;
  /** Breakdown of tasks by type */
  tasksByType: { ONE_TIME: number; RECURRING: number; DAILY_ELIGIBLE: number };
  /** Breakdown of tasks by priority */
  tasksByPriority: { HIGH: number; NORMAL: number; SOMEDAY: number };
  /** Per-topic stats: task counts and completion progress */
  topicsWithStats: Array<{
    id: string;
    title: string;
    icon: string | null;
    color: string | null;
    totalTasks: number;
    completedTasks: number;
  }>;
  /** All achievements, with earnedAt = null for locked ones */
  achievements: Array<{
    id: string;
    key: string;
    title: string;
    description: string;
    icon: string;
    earnedAt: Date | null;
  }>;
  /** Wishlist item counts and total amount spent */
  wishlistStats: {
    open: number;
    bought: number;
    discarded: number;
    totalSpent: number;
  };
  /** Sum of coinValue for all task completion records */
  coinsEarnedAllTime: number;
}

/**
 * Aggregate platform statistics for admin users.
 */
export interface AdminStatistics {
  /** Total number of registered users */
  totalUsers: number;
  /** New users registered in the last 7 days */
  newUsersLast7Days: number;
  /** New users registered in the last 30 days */
  newUsersLast30Days: number;
  /** Distinct users who completed at least one task in the last 7 days */
  activeUsersLast7Days: number;
  /** Distinct users who completed at least one task in the last 30 days */
  activeUsersLast30Days: number;
  /** User count broken down by OAuth provider */
  usersByProvider: Array<{ provider: string; count: number }>;
  /** Total tasks across all users */
  totalTasks: number;
  /** Total task completion records across all users */
  totalCompletions: number;
  /** Completions in the last 7 days */
  completionsLast7Days: number;
  /** Completions in the last 30 days */
  completionsLast30Days: number;
  /** Total topics across all users */
  totalTopics: number;
  /** Total user_achievements records (sum of all unlocked achievements) */
  totalAchievementsUnlocked: number;
  /** Average coin balance across all users */
  avgCoins: number;
  /** Average level across all users */
  avgLevel: number;
  /** Average current streak across all users */
  avgStreak: number;
  /** Top 10 users ranked by total completions */
  topUsersByCompletions: Array<{
    name: string | null;
    email: string | null;
    completions: number;
    coins: number;
    level: number;
  }>;
  /** How many users have earned each achievement */
  achievementDistribution: Array<{
    key: string;
    title: string;
    icon: string;
    earnedBy: number;
  }>;
  /** Aggregate wishlist purchase stats */
  wishlistStats: { totalBought: number; totalSpent: number };
}

// ─── User Statistics ──────────────────────────────────────────────────────────

/**
 * Fetches comprehensive statistics for a single user.
 *
 * Fires most queries in parallel via Promise.all for low latency.
 *
 * @param userId - The authenticated user's UUID
 * @returns A fully populated UserStatistics object
 */
export async function getUserStatistics(
  userId: string
): Promise<UserStatistics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    userRow,
    taskCounts,
    completionTotals,
    topicRows,
    achievementRows,
    wishlistRows,
    coinsRows,
  ] = await Promise.all([
    // User profile + gamification fields
    db
      .select({
        coins: users.coins,
        level: users.level,
        streakCurrent: users.streakCurrent,
        streakMax: users.streakMax,
        createdAt: users.createdAt,
        totalTasksCreated: users.totalTasksCreated,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),

    // Task counts grouped by type and priority — single pass
    db
      .select({
        type: tasks.type,
        priority: tasks.priority,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId)),

    // Completion totals (all, last 7d, last 30d)
    Promise.all([
      db
        .select({ total: count() })
        .from(taskCompletions)
        .where(eq(taskCompletions.userId, userId)),
      db
        .select({ total: count() })
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.userId, userId),
            gte(taskCompletions.completedAt, sevenDaysAgo)
          )
        ),
      db
        .select({ total: count() })
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.userId, userId),
            gte(taskCompletions.completedAt, thirtyDaysAgo)
          )
        ),
    ]),

    // Topics with per-topic task counts
    db
      .select({
        id: topics.id,
        title: topics.title,
        icon: topics.icon,
        color: topics.color,
        totalTasks: count(tasks.id),
        completedTasks: sql<number>`COUNT(CASE WHEN ${tasks.completedAt} IS NOT NULL THEN 1 END)`,
      })
      .from(topics)
      .leftJoin(tasks, eq(tasks.topicId, topics.id))
      .where(eq(topics.userId, userId))
      .groupBy(topics.id, topics.title, topics.icon, topics.color),

    // All achievements, with earnedAt for the ones this user has earned
    db
      .select({
        id: achievements.id,
        key: achievements.key,
        title: achievements.title,
        description: achievements.description,
        icon: achievements.icon,
        earnedAt: userAchievements.earnedAt,
      })
      .from(achievements)
      .leftJoin(
        userAchievements,
        and(
          eq(userAchievements.achievementId, achievements.id),
          eq(userAchievements.userId, userId)
        )
      ),

    // Wishlist item counts by status and total spent on BOUGHT items
    db
      .select({
        status: wishlistItems.status,
        itemCount: count(),
        totalPrice: sql<string>`COALESCE(SUM(CASE WHEN ${wishlistItems.status} = 'BOUGHT' THEN CAST(${wishlistItems.price} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))
      .groupBy(wishlistItems.status),

    // All-time coins earned (sum of coinValue from completions joined with tasks)
    db
      .select({
        total: sql<string>`COALESCE(SUM(${tasks.coinValue}), 0)`,
      })
      .from(taskCompletions)
      .innerJoin(tasks, eq(taskCompletions.taskId, tasks.id))
      .where(eq(taskCompletions.userId, userId)),
  ]);

  // ─── Aggregate task counts ───────────────────────────────────────────────────

  const tasksByType = { ONE_TIME: 0, RECURRING: 0, DAILY_ELIGIBLE: 0 };
  const tasksByPriority = { HIGH: 0, NORMAL: 0, SOMEDAY: 0 };
  let openTasks = 0;
  let completedTasksCount = 0;

  for (const t of taskCounts) {
    tasksByType[t.type]++;
    tasksByPriority[t.priority]++;
    if (t.completedAt === null) {
      openTasks++;
    } else {
      completedTasksCount++;
    }
  }

  // ─── Completion totals ────────────────────────────────────────────────────────

  const [allCompletions, last7d, last30d] = completionTotals;
  const totalCompletions = allCompletions[0]?.total ?? 0;
  const completionsLast7Days = last7d[0]?.total ?? 0;
  const completionsLast30Days = last30d[0]?.total ?? 0;

  // ─── Wishlist stats ───────────────────────────────────────────────────────────

  let wishlistOpen = 0;
  let wishlistBought = 0;
  let wishlistDiscarded = 0;
  let totalSpent = 0;

  // We do a second pass to get total spent across all BOUGHT records
  const wishlistTotalRow = await db
    .select({
      totalSpent: sql<string>`COALESCE(SUM(CAST(${wishlistItems.price} AS NUMERIC)), 0)`,
    })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.status, "BOUGHT")
      )
    );

  totalSpent = parseFloat(wishlistTotalRow[0]?.totalSpent ?? "0");

  for (const row of wishlistRows) {
    if (row.status === "OPEN") wishlistOpen += row.itemCount;
    if (row.status === "BOUGHT") wishlistBought += row.itemCount;
    if (row.status === "DISCARDED") wishlistDiscarded += row.itemCount;
  }

  // ─── User base fields ─────────────────────────────────────────────────────────

  const user = userRow[0];
  const coins = user?.coins ?? 0;
  const level = user?.level ?? 1;
  const streakCurrent = user?.streakCurrent ?? 0;
  const streakMax = user?.streakMax ?? 0;
  const memberSince = user?.createdAt ?? new Date();
  // Use the immutable counter from the users table so deleting tasks doesn't reduce this stat.
  // Existing users were backfilled to their task count at migration time (see 0004_messy_zodiak.sql).
  const totalTasksCreated = user?.totalTasksCreated ?? taskCounts.length;

  return {
    totalTasksCreated,
    openTasks,
    completedTasks: completedTasksCount,
    totalCompletions,
    completionsLast7Days,
    completionsLast30Days,
    totalTopics: topicRows.length,
    coins,
    level,
    streakCurrent,
    streakMax,
    memberSince,
    tasksByType,
    tasksByPriority,
    topicsWithStats: topicRows.map((r) => ({
      id: r.id,
      title: r.title,
      icon: r.icon,
      color: r.color,
      totalTasks: r.totalTasks,
      completedTasks: Number(r.completedTasks),
    })),
    achievements: achievementRows.map((r) => ({
      id: r.id,
      key: r.key,
      title: r.title,
      description: r.description,
      icon: r.icon,
      earnedAt: r.earnedAt ?? null,
    })),
    wishlistStats: {
      open: wishlistOpen,
      bought: wishlistBought,
      discarded: wishlistDiscarded,
      totalSpent,
    },
    coinsEarnedAllTime: parseInt(coinsRows[0]?.total ?? "0", 10),
  };
}

// ─── Admin Statistics ─────────────────────────────────────────────────────────

/**
 * Fetches aggregate platform-wide statistics for admin users.
 *
 * Queries all tables across all users. Only expose this to users listed
 * in ADMIN_USER_IDS.
 *
 * @returns A fully populated AdminStatistics object
 */
export async function getAdminStatistics(): Promise<AdminStatistics> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsersRows,
    newUsers7dRows,
    newUsers30dRows,
    activeUsers7dRows,
    activeUsers30dRows,
    providerRows,
    totalTasksRows,
    totalCompletionsRows,
    completions7dRows,
    completions30dRows,
    totalTopicsRows,
    totalAchievementsRows,
    avgRows,
    topUsersRows,
    achievementDistRows,
    wishlistTotalRows,
  ] = await Promise.all([
    // Total users
    db.select({ total: count() }).from(users),

    // New users last 7 days
    db
      .select({ total: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo)),

    // New users last 30 days
    db
      .select({ total: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo)),

    // Active users last 7 days (distinct userId with completions)
    db
      .select({
        total: sql<number>`COUNT(DISTINCT ${taskCompletions.userId})`,
      })
      .from(taskCompletions)
      .where(gte(taskCompletions.completedAt, sevenDaysAgo)),

    // Active users last 30 days (distinct userId with completions)
    db
      .select({
        total: sql<number>`COUNT(DISTINCT ${taskCompletions.userId})`,
      })
      .from(taskCompletions)
      .where(gte(taskCompletions.completedAt, thirtyDaysAgo)),

    // Users by OAuth provider
    db
      .select({
        provider: accounts.provider,
        userCount: count(),
      })
      .from(accounts)
      .groupBy(accounts.provider)
      .orderBy(desc(count())),

    // Total tasks
    db.select({ total: count() }).from(tasks),

    // Total completions
    db.select({ total: count() }).from(taskCompletions),

    // Completions last 7 days
    db
      .select({ total: count() })
      .from(taskCompletions)
      .where(gte(taskCompletions.completedAt, sevenDaysAgo)),

    // Completions last 30 days
    db
      .select({ total: count() })
      .from(taskCompletions)
      .where(gte(taskCompletions.completedAt, thirtyDaysAgo)),

    // Total topics
    db.select({ total: count() }).from(topics),

    // Total achievements unlocked
    db.select({ total: count() }).from(userAchievements),

    // Averages for coins, level, streak
    db
      .select({
        avgCoins: avg(users.coins),
        avgLevel: avg(users.level),
        avgStreak: avg(users.streakCurrent),
      })
      .from(users),

    // Top 10 users by completions
    db
      .select({
        name: users.name,
        email: users.email,
        completions: count(taskCompletions.id),
        coins: users.coins,
        level: users.level,
      })
      .from(taskCompletions)
      .innerJoin(users, eq(taskCompletions.userId, users.id))
      .groupBy(users.id, users.name, users.email, users.coins, users.level)
      .orderBy(desc(count(taskCompletions.id)))
      .limit(10),

    // Achievement distribution (how many users earned each)
    db
      .select({
        key: achievements.key,
        title: achievements.title,
        icon: achievements.icon,
        earnedBy: count(userAchievements.id),
      })
      .from(achievements)
      .leftJoin(
        userAchievements,
        eq(userAchievements.achievementId, achievements.id)
      )
      .groupBy(achievements.id, achievements.key, achievements.title, achievements.icon)
      .orderBy(desc(count(userAchievements.id))),

    // Wishlist: bought count and total amount spent
    db
      .select({
        totalBought: count(),
        totalSpent: sql<string>`COALESCE(SUM(CAST(${wishlistItems.price} AS NUMERIC)), 0)`,
      })
      .from(wishlistItems)
      .where(
        and(isNotNull(wishlistItems.price), eq(wishlistItems.status, "BOUGHT"))
      ),
  ]);

  const avgs = avgRows[0];

  return {
    totalUsers: totalUsersRows[0]?.total ?? 0,
    newUsersLast7Days: newUsers7dRows[0]?.total ?? 0,
    newUsersLast30Days: newUsers30dRows[0]?.total ?? 0,
    activeUsersLast7Days: Number(activeUsers7dRows[0]?.total ?? 0),
    activeUsersLast30Days: Number(activeUsers30dRows[0]?.total ?? 0),
    usersByProvider: providerRows.map((r) => ({
      provider: r.provider,
      count: r.userCount,
    })),
    totalTasks: totalTasksRows[0]?.total ?? 0,
    totalCompletions: totalCompletionsRows[0]?.total ?? 0,
    completionsLast7Days: completions7dRows[0]?.total ?? 0,
    completionsLast30Days: completions30dRows[0]?.total ?? 0,
    totalTopics: totalTopicsRows[0]?.total ?? 0,
    totalAchievementsUnlocked: totalAchievementsRows[0]?.total ?? 0,
    avgCoins: Math.round(Number(avgs?.avgCoins ?? 0)),
    avgLevel: Math.round(Number(avgs?.avgLevel ?? 0) * 10) / 10,
    avgStreak: Math.round(Number(avgs?.avgStreak ?? 0) * 10) / 10,
    topUsersByCompletions: topUsersRows.map((r) => ({
      name: r.name,
      email: r.email,
      completions: r.completions,
      coins: r.coins,
      level: r.level,
    })),
    achievementDistribution: achievementDistRows.map((r) => ({
      key: r.key,
      title: r.title,
      icon: r.icon,
      earnedBy: r.earnedBy,
    })),
    wishlistStats: {
      totalBought: wishlistTotalRows[0]?.totalBought ?? 0,
      totalSpent: parseFloat(wishlistTotalRows[0]?.totalSpent ?? "0"),
    },
  };
}
