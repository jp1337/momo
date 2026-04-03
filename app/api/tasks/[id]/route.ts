/**
 * GET /api/tasks/:id
 * Returns a single task by ID for the authenticated user.
 * Requires: authentication
 * Returns: { task: Task }
 *
 * PATCH /api/tasks/:id
 * Updates a task owned by the authenticated user.
 * Requires: authentication
 * Body: UpdateTaskInput (all fields optional)
 * Returns: { task: Task }
 *
 * DELETE /api/tasks/:id
 * Deletes a task owned by the authenticated user.
 * Requires: authentication
 * Returns: { success: true }
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { getTaskById, updateTask, deleteTask } from "@/lib/tasks";
import { UpdateTaskInputSchema } from "@/lib/validators";

/**
 * GET /api/tasks/:id
 * Returns a single task by ID.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const task = await getTaskById(id, user.userId);
    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    return Response.json({ task });
  } catch (error) {
    console.error("[GET /api/tasks/:id]", error);
    return Response.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

/**
 * PATCH /api/tasks/:id
 * Updates a task (partial update — only provided fields are changed).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateTaskInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const task = await updateTask(id, user.userId, parsed.data);
    return Response.json({ task });
  } catch (error) {
    console.error("[PATCH /api/tasks/:id]", error);
    const isNotFound =
      error instanceof Error && error.message.includes("not found");
    if (isNotFound) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/:id
 * Permanently deletes a task.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  const { id } = await params;

  try {
    await deleteTask(id, user.userId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/:id]", error);
    const isNotFound =
      error instanceof Error && error.message.includes("not found");
    if (isNotFound) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
