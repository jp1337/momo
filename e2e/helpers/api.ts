import type { APIRequestContext } from "@playwright/test";

/**
 * API helpers for E2E test setup and teardown.
 * Uses the stored auth session so all requests are authenticated
 * as the E2E test user.
 */

export interface Task {
  id: string;
  title: string;
  type: string;
  priority: string;
  completedAt: string | null;
}

export interface Topic {
  id: string;
  title: string;
  color: string | null;
}

export interface WishlistItem {
  id: string;
  title: string;
  coinUnlockThreshold: number | null;
  price: string | null;
}

/** Create a one-time task and return the created task object. */
export async function createTask(
  request: APIRequestContext,
  title: string,
  overrides: Record<string, unknown> = {}
): Promise<Task> {
  const res = await request.post("/api/tasks", {
    data: { title, type: "ONE_TIME", priority: "NORMAL", ...overrides },
  });
  if (!res.ok()) {
    throw new Error(`createTask failed: ${res.status()} ${await res.text()}`);
  }
  // POST /api/tasks returns { task }, not the bare task — unwrap it.
  // Previously this function returned the whole wrapper cast as Task, so
  // every caller's `task.id` / `task.title` was silently undefined
  // (found during Task B3's final verification pass, 2026-08-22).
  const { task } = (await res.json()) as { task: Task };
  return task;
}

/** Delete a task by ID (cleanup helper). */
export async function deleteTask(
  request: APIRequestContext,
  id: string
): Promise<void> {
  await request.delete(`/api/tasks/${id}`);
}

/** Create a topic and return the created topic object. */
export async function createTopic(
  request: APIRequestContext,
  title: string,
  overrides: Record<string, unknown> = {}
): Promise<Topic> {
  const res = await request.post("/api/topics", {
    data: { title, ...overrides },
  });
  if (!res.ok()) {
    throw new Error(`createTopic failed: ${res.status()} ${await res.text()}`);
  }
  // POST /api/topics returns { topic }, not the bare topic — see createTask().
  const { topic } = (await res.json()) as { topic: Topic };
  return topic;
}

/** Delete a topic by ID (cleanup helper). */
export async function deleteTopic(
  request: APIRequestContext,
  id: string
): Promise<void> {
  await request.delete(`/api/topics/${id}`);
}

/** Create a wishlist item and return it. */
export async function createWishlistItem(
  request: APIRequestContext,
  title: string,
  overrides: Record<string, unknown> = {}
): Promise<WishlistItem> {
  const res = await request.post("/api/wishlist", {
    data: { title, priority: "WANT", ...overrides },
  });
  if (!res.ok()) {
    throw new Error(
      `createWishlistItem failed: ${res.status()} ${await res.text()}`
    );
  }
  // POST /api/wishlist returns { item }, not the bare item — see createTask().
  const { item } = (await res.json()) as { item: WishlistItem };
  return item;
}

/** Delete a wishlist item by ID. */
export async function deleteWishlistItem(
  request: APIRequestContext,
  id: string
): Promise<void> {
  await request.delete(`/api/wishlist/${id}`);
}
