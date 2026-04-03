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
    return Response.json({ topic }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/topics]", error);
    return Response.json({ error: "Failed to create topic" }, { status: 500 });
  }
}
