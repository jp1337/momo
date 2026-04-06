/**
 * Typed Momo API client for the Alexa Skill Lambda.
 *
 * Authenticates via Bearer token (Personal API Key from Momo Settings).
 * The token is stored as the Alexa account-linking accessToken and is
 * injected into every Lambda request via the Alexa request envelope.
 *
 * Base URL is read from the MOMO_API_BASE_URL Lambda environment variable.
 * Defaults to "https://momotask.app" if not set.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MomoTask {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  dueDate: string | null;
  completedAt: string | null;
  coinValue: number;
  isDailyQuest: boolean;
  estimatedMinutes: number | null;
}

export interface MomoTopic {
  id: string;
  title: string;
  color: string | null;
}

export interface MomoTaskWithTopic extends MomoTask {
  topic: MomoTopic | null;
}

// ─── Client ───────────────────────────────────────────────────────────────────

const BASE_URL =
  (process.env.MOMO_API_BASE_URL ?? "https://momotask.app").replace(/\/$/, "");

/**
 * Shared fetch wrapper — injects auth header and parses JSON.
 * Throws a descriptive Error on non-2xx responses.
 */
async function momoFetch<T>(
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let msg = `Momo API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // ignore JSON parse errors on error responses
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ─── API methods ──────────────────────────────────────────────────────────────

/**
 * Creates a new ONE_TIME task for the authenticated user.
 *
 * @param apiKey  - Momo Personal API Key
 * @param title   - Task title (1–255 chars)
 * @returns The created task
 */
export async function addTask(
  apiKey: string,
  title: string
): Promise<MomoTask> {
  const data = await momoFetch<{ task: MomoTask }>(apiKey, "/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title, type: "ONE_TIME" }),
  });
  return data.task;
}

/**
 * Returns the user's current daily quest (selects one if none is active).
 *
 * @param apiKey  - Momo Personal API Key
 * @returns The daily quest task with optional topic, or null if no tasks exist
 */
export async function getDailyQuest(
  apiKey: string
): Promise<MomoTaskWithTopic | null> {
  const data = await momoFetch<{ quest: MomoTaskWithTopic | null }>(
    apiKey,
    "/api/daily-quest"
  );
  return data.quest;
}

/**
 * Returns all open (not completed) tasks for the authenticated user.
 * Filters client-side since the API returns all tasks.
 *
 * @param apiKey  - Momo Personal API Key
 * @returns Array of open tasks, sorted as returned by the API
 */
export async function getOpenTasks(apiKey: string): Promise<MomoTask[]> {
  const data = await momoFetch<{ tasks: MomoTask[] }>(apiKey, "/api/tasks");
  return data.tasks.filter((t) => t.completedAt === null);
}
