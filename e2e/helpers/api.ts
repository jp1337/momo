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
  return res.json() as Promise<Task>;
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
  return res.json() as Promise<Topic>;
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
  return res.json() as Promise<WishlistItem>;
}

/** Delete a wishlist item by ID. */
export async function deleteWishlistItem(
  request: APIRequestContext,
  id: string
): Promise<void> {
  await request.delete(`/api/wishlist/${id}`);
}
