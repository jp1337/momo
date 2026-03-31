/**
 * GET /api/topics/:id
 * Returns a single topic with all associated tasks.
 * Requires: authentication
 * Returns: { topic: TopicWithTasks }
 *
 * PATCH /api/topics/:id
 * Updates a topic owned by the authenticated user.
 * Requires: authentication
 * Body: UpdateTopicInput (all fields optional)
 * Returns: { topic: Topic }
 *
 * DELETE /api/topics/:id
 * Deletes a topic. Reassigns its tasks to no topic (standalone).
 * Requires: authentication
 * Returns: { success: true }
 */

import { auth } from "@/lib/auth";
import { getTopicById, updateTopic, deleteTopic } from "@/lib/topics";
import { UpdateTopicInputSchema } from "@/lib/validators";

/**
 * GET /api/topics/:id
 * Returns a single topic with all its tasks.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const topic = await getTopicById(id, session.user.id);
    if (!topic) {
      return Response.json({ error: "Topic not found" }, { status: 404 });
    }
    return Response.json({ topic });
  } catch (error) {
    console.error("[GET /api/topics/:id]", error);
    return Response.json({ error: "Failed to fetch topic" }, { status: 500 });
  }
}

/**
 * PATCH /api/topics/:id
 * Updates a topic (partial update).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateTopicInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const topic = await updateTopic(id, session.user.id, parsed.data);
    return Response.json({ topic });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update topic";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[PATCH /api/topics/:id]", error);
    return Response.json({ error: message }, { status });
  }
}

/**
 * DELETE /api/topics/:id
 * Deletes the topic and reassigns its tasks to no topic.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteTopic(id, session.user.id);
    return Response.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete topic";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[DELETE /api/topics/:id]", error);
    return Response.json({ error: message }, { status });
  }
}
