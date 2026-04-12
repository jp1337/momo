/**
 * GET /api/topics
 * Lists all topics for the authenticated user with task counts.
 * Requires: authentication
 * Returns: { topics: TopicWithCounts[] }
 *
 * POST /api/topics
 * Creates a new topic for the authenticated user.
 * Requires: authentication
 * Body: CreateTopicInput (validated with Zod)
 * Returns: { topic: Topic }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { getUserTopics, createTopic } from "@/lib/topics";
import { CreateTopicInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { topics, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkAndUnlockAchievements } from "@/lib/gamification";

/**
 * GET /api/topics
 * Returns all topics with task count statistics.
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userTopics = await getUserTopics(user.userId);
    return Response.json({ topics: userTopics });
  } catch (error) {
    console.error("[GET /api/topics]", error);
    return Response.json({ error: "Failed to fetch topics" }, { status: 500 });
  }
}

/**
 * POST /api/topics
 * Creates a new topic.
 */
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 30 topic creations per minute per user
  const rateCheck = checkRateLimit(`topics-create:${user.userId}`, 30, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateTopicInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const topic = await createTopic(user.userId, parsed.data);

    // Fire-and-forget achievement check for topic milestones
    (async () => {
      try {
        const [topicCountRows, seqTopicRows] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(topics).where(eq(topics.userId, user.userId)),
          db.select({ id: topics.id }).from(topics).where(and(eq(topics.userId, user.userId), eq(topics.sequential, true))).limit(1),
        ]);
        const topicsCreated = Number(topicCountRows[0]?.count ?? 0);
        const hasSequentialTopic = seqTopicRows.length > 0;
        const result = await checkAndUnlockAchievements(user.userId, {
          totalCompleted: 0,
          streakCurrent: 0,
          coins: 0,
          level: 1,
          topicsCreated,
          hasSequentialTopic,
        });
        if (result.coinsAwarded > 0) {
          await db.update(users).set({ coins: sql`${users.coins} + ${result.coinsAwarded}` }).where(eq(users.id, user.userId));
        }
        if (result.unlocked.length > 0) {
          const { sendAchievementNotifications } = await import("@/lib/push");
          await sendAchievementNotifications(user.userId, result.unlocked);
        }
      } catch (err) {
        console.error("[POST /api/topics] achievement check failed (non-fatal):", err);
      }
    })();

    return Response.json({ topic }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/topics]", error);
    return Response.json({ error: "Failed to create topic" }, { status: 500 });
  }
}
