/**
 * Topic templates — predefined topic/subtask blueprints for one-click import.
 *
 * Templates live as TypeScript constants (not in the database) because they are
 * curated content, not user data. Each template references i18n keys under the
 * `templates.*` namespace in `messages/{de,en,fr}.json`; titles are resolved
 * server-side at import time so the user's current UI locale is captured in the
 * newly created rows. Edits afterwards are normal user content — the imported
 * text is decoupled from the i18n layer.
 *
 * Adding a new template:
 *  1. Append a new entry to TEMPLATES with a unique `key`
 *  2. Add the matching `templates.<key>.*` block to all three message files
 *  3. Pick an icon key from `lib/topic-icons.ts` and a hex color
 *
 * @module lib/templates
 */

import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { topics, tasks, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import type { Locale } from "@/i18n/locales";
import type { Task, Topic } from "@/lib/tasks";
import { getLocalDateString } from "@/lib/date-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single task inside a template. */
export interface TemplateTask {
  /** i18n key relative to the `templates` namespace, e.g. "moving.task_1" */
  titleKey: string;
  /** Optional per-task override. Falls back to the template priority. */
  priority?: "HIGH" | "NORMAL" | "SOMEDAY";
  /** Optional per-task override. Falls back to the template defaultEnergyLevel. */
  energyLevel?: "HIGH" | "MEDIUM" | "LOW";
  /** Optional estimate in minutes (5 / 15 / 30 / 60). */
  estimatedMinutes?: 5 | 15 | 30 | 60;
  /** Task type. Defaults to `ONE_TIME` when omitted (backward-compatible). */
  type?: "ONE_TIME" | "RECURRING";
  /** Days between occurrences. Only meaningful when `type === "RECURRING"`. */
  recurrenceInterval?: number;
}

/** A topic template — produces a topic + ordered list of subtasks on import. */
export interface Template {
  /** Stable string key used in the API and the picker UI. */
  key: TemplateKey;
  /** i18n key for the template display title (inside the `templates` namespace). */
  titleKey: string;
  /** i18n key for the template description shown in the picker. */
  descriptionKey: string;
  /** Icon key from `lib/topic-icons.ts`. */
  icon: string;
  /** Hex color (6 chars, leading #). */
  color: string;
  /** Topic priority for the created topic. */
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  /** Whether the created topic should enforce sequential task ordering. */
  sequential: boolean;
  /** Default energy level for the topic. Tasks without explicit level inherit it. */
  defaultEnergyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  /** Ordered list of subtasks. Order becomes `sortOrder` in the database. */
  tasks: TemplateTask[];
}

export type TemplateKey = "moving" | "taxes" | "fitness" | "household";

/** All template keys in the order they should appear in the picker. */
export const TEMPLATE_KEYS: readonly TemplateKey[] = [
  "moving",
  "taxes",
  "fitness",
  "household",
] as const;

// ─── Template Definitions ─────────────────────────────────────────────────────

/**
 * The full catalogue of available templates.
 *
 * Keep this list short and high-quality — templates are meant to nudge the user
 * into starting a difficult life project (moving, taxes, fitness), not to cover
 * every possible scenario. Additional ideas belong in the roadmap backlog.
 */
export const TEMPLATES: Record<TemplateKey, Template> = {
  moving: {
    key: "moving",
    titleKey: "moving.title",
    descriptionKey: "moving.description",
    icon: "house",
    color: "#c97b3e",
    priority: "HIGH",
    sequential: true,
    defaultEnergyLevel: "MEDIUM",
    tasks: [
      { titleKey: "moving.task_1", priority: "HIGH", estimatedMinutes: 30 },
      { titleKey: "moving.task_2", priority: "HIGH", estimatedMinutes: 60 },
      { titleKey: "moving.task_3", estimatedMinutes: 15 },
      { titleKey: "moving.task_4", estimatedMinutes: 30 },
      { titleKey: "moving.task_5", estimatedMinutes: 30 },
      { titleKey: "moving.task_6", energyLevel: "LOW", estimatedMinutes: 30 },
      { titleKey: "moving.task_7", energyLevel: "HIGH", estimatedMinutes: 60 },
      { titleKey: "moving.task_8", estimatedMinutes: 30 },
      { titleKey: "moving.task_9", priority: "HIGH", estimatedMinutes: 60 },
      { titleKey: "moving.task_10", estimatedMinutes: 60 },
    ],
  },
  taxes: {
    key: "taxes",
    titleKey: "taxes.title",
    descriptionKey: "taxes.description",
    icon: "coins",
    color: "#4a8c5c",
    priority: "NORMAL",
    sequential: true,
    defaultEnergyLevel: "MEDIUM",
    tasks: [
      { titleKey: "taxes.task_1", energyLevel: "LOW", estimatedMinutes: 30 },
      { titleKey: "taxes.task_2", estimatedMinutes: 15 },
      { titleKey: "taxes.task_3", estimatedMinutes: 30 },
      { titleKey: "taxes.task_4", estimatedMinutes: 30 },
      { titleKey: "taxes.task_5", energyLevel: "HIGH", estimatedMinutes: 60 },
      { titleKey: "taxes.task_6", priority: "HIGH", estimatedMinutes: 15 },
    ],
  },
  fitness: {
    key: "fitness",
    titleKey: "fitness.title",
    descriptionKey: "fitness.description",
    icon: "dumbbell",
    color: "#8a5cf0",
    priority: "NORMAL",
    sequential: false,
    defaultEnergyLevel: "HIGH",
    tasks: [
      { titleKey: "fitness.task_1", energyLevel: "LOW", estimatedMinutes: 5 },
      { titleKey: "fitness.task_2", energyLevel: "LOW", estimatedMinutes: 5 },
      { titleKey: "fitness.task_3", estimatedMinutes: 15 },
      { titleKey: "fitness.task_4", estimatedMinutes: 30 },
      { titleKey: "fitness.task_5", estimatedMinutes: 30 },
      { titleKey: "fitness.task_6", energyLevel: "MEDIUM", estimatedMinutes: 15 },
      { titleKey: "fitness.task_7", energyLevel: "LOW", estimatedMinutes: 5 },
    ],
  },
  household: {
    key: "household",
    titleKey: "household.title",
    descriptionKey: "household.description",
    icon: "broom",
    color: "#5c8ab8",
    priority: "NORMAL",
    sequential: false,
    defaultEnergyLevel: "MEDIUM",
    tasks: [
      { titleKey: "household.task_laundry", type: "RECURRING", recurrenceInterval: 7, estimatedMinutes: 30, energyLevel: "LOW" },
      { titleKey: "household.task_vacuum", type: "RECURRING", recurrenceInterval: 7, estimatedMinutes: 15, energyLevel: "MEDIUM" },
      { titleKey: "household.task_kitchen", type: "RECURRING", recurrenceInterval: 3, estimatedMinutes: 15, energyLevel: "LOW" },
      { titleKey: "household.task_bathroom", type: "RECURRING", recurrenceInterval: 14, estimatedMinutes: 30, energyLevel: "MEDIUM" },
      { titleKey: "household.task_windows", type: "RECURRING", recurrenceInterval: 30, estimatedMinutes: 60, energyLevel: "HIGH" },
      { titleKey: "household.task_bedding", type: "RECURRING", recurrenceInterval: 14, estimatedMinutes: 15, energyLevel: "MEDIUM" },
    ],
  },
};

/**
 * Returns the template for the given key, or `null` if unknown.
 *
 * @param key - Template key as stored in `TEMPLATES`
 * @returns The template definition, or null if the key is not recognised
 */
export function getTemplate(key: string): Template | null {
  if (!Object.prototype.hasOwnProperty.call(TEMPLATES, key)) return null;
  return TEMPLATES[key as TemplateKey];
}

// ─── Importer ─────────────────────────────────────────────────────────────────

/** Result returned by `importTopicFromTemplate`. */
export interface ImportTemplateResult {
  topic: Topic;
  tasks: Task[];
}

/**
 * Creates a new topic with all subtasks from a template, atomically.
 *
 * Runs the topic insert, the bulk task insert and the `totalTasksCreated`
 * counter update inside a single Drizzle transaction — mirrors the pattern
 * used by `breakdownTask` in `lib/tasks.ts`. Task titles are resolved via
 * next-intl in the provided locale so the DB rows contain plain, editable
 * text in the user's current UI language.
 *
 * RECURRING template tasks (e.g. the household template) are honoured: each
 * task's `type` and `recurrenceInterval` are forwarded to the DB row, and
 * `nextDueDate` is set to the user's local today — mirrors the `createTask`
 * behaviour in `lib/tasks.ts` so the imported recurring tasks are immediately
 * visible to the daily-quest algorithm and the habit tracker.
 *
 * @param userId - The authenticated user's UUID (ownership for topic + tasks)
 * @param key - Template key; rejected if not in `TEMPLATES`
 * @param locale - UI locale used to resolve template strings
 * @returns The created topic and the array of created tasks (in sortOrder)
 * @throws Error if the template key is unknown
 */
export async function importTopicFromTemplate(
  userId: string,
  key: string,
  locale: Locale
): Promise<ImportTemplateResult> {
  const template = getTemplate(key);
  if (!template) {
    throw new Error(`Unknown template: ${key}`);
  }

  // Resolve all strings up front so the transaction stays short.
  const t = await getTranslations({ locale, namespace: "templates" });
  const topicTitle = t(template.titleKey);
  const topicDescription = t(template.descriptionKey);
  const taskTitles = template.tasks.map((task) => t(task.titleKey));

  // Pull the user's IANA timezone so RECURRING tasks get a local-today
  // `nextDueDate` (UTC off-by-one avoidance, same as `createTask`).
  const userRow = (
    await db
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0];
  const todayLocal = getLocalDateString(userRow?.timezone ?? null);

  return db.transaction(async (tx) => {
    const topicRows = await tx
      .insert(topics)
      .values({
        userId,
        title: topicTitle,
        description: topicDescription,
        color: template.color,
        icon: template.icon,
        priority: template.priority,
        sequential: template.sequential,
        defaultEnergyLevel: template.defaultEnergyLevel,
      })
      .returning();

    const newTopic = topicRows[0];

    const taskRows = await tx
      .insert(tasks)
      .values(
        template.tasks.map((task, index) => {
          const type = task.type ?? "ONE_TIME";
          const isRecurring = type === "RECURRING";
          return {
            userId,
            topicId: newTopic.id,
            title: taskTitles[index],
            type,
            priority: task.priority ?? template.priority,
            energyLevel: task.energyLevel ?? template.defaultEnergyLevel,
            estimatedMinutes: task.estimatedMinutes ?? null,
            recurrenceInterval: isRecurring ? (task.recurrenceInterval ?? null) : null,
            nextDueDate: isRecurring ? todayLocal : null,
            sortOrder: index,
          };
        })
      )
      .returning();

    await tx
      .update(users)
      .set({
        totalTasksCreated: sql`${users.totalTasksCreated} + ${template.tasks.length}`,
      })
      .where(eq(users.id, userId));

    return { topic: newTopic, tasks: taskRows };
  });
}
