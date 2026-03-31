/**
 * GET /api/tasks
 * Lists all tasks for the authenticated user.
 * Requires: authentication
 * Query: ?topicId=<uuid|"none">&type=<ONE_TIME|RECURRING|DAILY_ELIGIBLE>&completed=<true|false>
 * Returns: { tasks: Task[] }
 *
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 * Requires: authentication
 * Body: CreateTaskInput (validated with Zod)
 * Returns: { task: Task }
 */

import { auth } from "@/lib/auth";
import { getUserTasks, createTask } from "@/lib/tasks";
import { CreateTaskInputSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/tasks
 * Returns all tasks for the authenticated user with optional filters.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const topicIdParam = searchParams.get("topicId");
  const typeParam = searchParams.get("type");
  const completedParam = searchParams.get("completed");

  const filters: {
    topicId?: string | null;
    type?: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
    completed?: boolean;
  } = {};

  if (topicIdParam !== null) {
    filters.topicId = topicIdParam === "none" ? null : topicIdParam;
  }

  if (
    typeParam === "ONE_TIME" ||
    typeParam === "RECURRING" ||
    typeParam === "DAILY_ELIGIBLE"
  ) {
    filters.type = typeParam;
  }

  if (completedParam === "true") filters.completed = true;
  if (completedParam === "false") filters.completed = false;

  try {
    const userTasks = await getUserTasks(session.user.id, filters);
    return Response.json({ tasks: userTasks });
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return Response.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

/**
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 task creations per minute per user
  const rateCheck = checkRateLimit(`tasks-create:${session.user.id}`, 60, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateTaskInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const task = await createTask(session.user.id, parsed.data);
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return Response.json({ error: "Failed to create task" }, { status: 500 });
  }
}
