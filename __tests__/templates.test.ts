/**
 * Tests for lib/templates.ts.
 *
 * getTemplate is a pure lookup — no DB, no mocks needed.
 * importTopicFromTemplate writes to the DB. It uses next-intl's
 * getTranslations() which requires a Next.js request context, so we
 * mock next-intl/server to load the English messages JSON directly.
 */

import { describe, it, expect, vi } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { topics, users } from "@/lib/db/schema";
import { getTemplate, importTopicFromTemplate, TEMPLATES } from "@/lib/templates";
import { createTestUser } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── Mock next-intl/server ────────────────────────────────────────────────────
// Load English messages from disk and return a translator that walks the key
// path inside the requested namespace.

vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messages = require("../messages/en.json") as Record<string, unknown>;
    const ns = messages[namespace] as Record<string, unknown> | undefined;
    return (key: string) => {
      if (!ns) return key;
      const parts = key.split(".");
      let val: unknown = ns;
      for (const part of parts) {
        val = (val as Record<string, unknown>)?.[part];
      }
      return typeof val === "string" ? val : key;
    };
  },
}));

// ─── getTemplate (pure) ───────────────────────────────────────────────────────

describe("getTemplate", () => {
  it("returns the moving template by key", () => {
    const t = getTemplate("moving");
    expect(t).not.toBeNull();
    expect(t!.key).toBe("moving");
    expect(t!.tasks.length).toBeGreaterThan(0);
  });

  it("returns the taxes template by key", () => {
    const t = getTemplate("taxes");
    expect(t).not.toBeNull();
    expect(t!.key).toBe("taxes");
  });

  it("returns the fitness template by key", () => {
    const t = getTemplate("fitness");
    expect(t).not.toBeNull();
    expect(t!.key).toBe("fitness");
  });

  it("returns the household template by key", () => {
    const t = getTemplate("household");
    expect(t).not.toBeNull();
    expect(t!.key).toBe("household");
  });

  it("returns null for an unknown key", () => {
    expect(getTemplate("unknown_key_xyz")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getTemplate("")).toBeNull();
  });

  it("every defined template key resolves to a non-null template", () => {
    for (const key of Object.keys(TEMPLATES)) {
      expect(getTemplate(key)).not.toBeNull();
    }
  });

  it("household template has RECURRING tasks", () => {
    const t = getTemplate("household");
    const recurring = t!.tasks.filter((task) => task.type === "RECURRING");
    expect(recurring.length).toBeGreaterThan(0);
  });

  it("moving template is sequential", () => {
    const t = getTemplate("moving");
    expect(t!.sequential).toBe(true);
  });
});

// ─── importTopicFromTemplate ──────────────────────────────────────────────────

describe("importTopicFromTemplate", () => {
  it("throws for an unknown template key", async () => {
    const user = await createTestUser({ timezone: TZ });

    await expect(
      importTopicFromTemplate(user.id, "nonexistent", "en")
    ).rejects.toThrow("Unknown template");
  });

  it("creates a topic owned by the user", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { topic } = await importTopicFromTemplate(user.id, "taxes", "en");

    expect(topic.userId).toBe(user.id);
    expect(topic.id).toBeDefined();
  });

  it("creates the correct number of tasks for the template", async () => {
    const user = await createTestUser({ timezone: TZ });
    const template = getTemplate("taxes")!;

    const { tasks: createdTasks } = await importTopicFromTemplate(
      user.id,
      "taxes",
      "en"
    );

    expect(createdTasks).toHaveLength(template.tasks.length);
  });

  it("assigns translated English title to the topic", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { topic } = await importTopicFromTemplate(user.id, "taxes", "en");

    expect(typeof topic.title).toBe("string");
    expect(topic.title.length).toBeGreaterThan(0);
    // English messages have "Tax return" as taxes.title
    expect(topic.title).toBe("Tax return");
  });

  it("assigns sortOrder to tasks starting at 0", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { tasks: createdTasks } = await importTopicFromTemplate(
      user.id,
      "moving",
      "en"
    );

    const sortOrders = createdTasks.map((t) => t.sortOrder).sort((a, b) => a - b);
    expect(sortOrders[0]).toBe(0);
    expect(sortOrders[sortOrders.length - 1]).toBe(createdTasks.length - 1);
  });

  it("increments totalTasksCreated on the user row", async () => {
    const user = await createTestUser({ timezone: TZ });
    const template = getTemplate("fitness")!;

    await importTopicFromTemplate(user.id, "fitness", "en");

    const [row] = await db
      .select({ totalTasksCreated: users.totalTasksCreated })
      .from(users)
      .where(eq(users.id, user.id));

    expect(row.totalTasksCreated).toBe(template.tasks.length);
  });

  it("sets nextDueDate on RECURRING template tasks", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { tasks: createdTasks } = await importTopicFromTemplate(
      user.id,
      "household",
      "en"
    );

    const recurring = createdTasks.filter((t) => t.type === "RECURRING");
    expect(recurring.length).toBeGreaterThan(0);
    for (const task of recurring) {
      expect(task.nextDueDate).not.toBeNull();
    }
  });

  it("assigns all tasks to the created topic", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { topic, tasks: createdTasks } = await importTopicFromTemplate(
      user.id,
      "taxes",
      "en"
    );

    for (const task of createdTasks) {
      expect(task.topicId).toBe(topic.id);
    }
  });

  it("isolates topics and tasks by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    await importTopicFromTemplate(userA.id, "moving", "en");

    const userBTopics = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.userId, userB.id));
    expect(userBTopics).toHaveLength(0);
  });
});
