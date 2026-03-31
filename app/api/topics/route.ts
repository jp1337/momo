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

import { auth } from "@/lib/auth";
import { getUserTopics, createTopic } from "@/lib/topics";
import { CreateTopicInputSchema } from "@/lib/validators";

/**
 * GET /api/topics
 * Returns all topics with task count statistics.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userTopics = await getUserTopics(session.user.id);
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
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const topic = await createTopic(session.user.id, parsed.data);
    return Response.json({ topic }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/topics]", error);
    return Response.json({ error: "Failed to create topic" }, { status: 500 });
  }
}
