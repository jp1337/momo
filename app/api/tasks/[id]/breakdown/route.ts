/**
 * POST /api/tasks/:id/breakdown
 * Breaks a task into multiple subtasks inside a new topic.
 * The original task is deleted. A new topic is created with the task's title,
 * and the provided subtask titles become individual tasks within that topic.
 * Requires: authentication
 * Body: { subtaskTitles: string[] } (2–10 items)
 * Returns: { topicId: string, tasks: Task[] }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { breakdownTask } from "@/lib/tasks";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const BreakdownBodySchema = z.object({
  subtaskTitles: z
    .array(z.string().min(1).max(255))
    .min(2, "At least 2 subtasks required")
    .max(10, "Maximum 10 subtasks"),
});

/**
 * POST — Breaks a task into subtasks.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse() as NextResponse;

  const { id: taskId } = await params;
  if (!taskId) {
    return NextResponse.json({ error: "Missing task ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BreakdownBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const result = await breakdownTask(taskId, user.userId, parsed.data.subtaskTitles);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/tasks/:id/breakdown]", err);
    if (err instanceof Error && err.message.includes("not found")) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to break down task" }, { status: 500 });
  }
}
