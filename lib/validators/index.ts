/**
 * Zod validation schemas for Momo API inputs.
 *
 * All schemas are defined here and imported by API route handlers.
 * Each schema corresponds to a specific API operation.
 */

import { z } from "zod";

// ─── Task Validators ──────────────────────────────────────────────────────────

/**
 * Schema for creating a new task.
 * Validates all required and optional task fields.
 */
export const CreateTaskInputSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or less"),
    topicId: z.string().uuid("Invalid topic ID").nullable().optional(),
    notes: z.string().nullable().optional(),
    type: z.enum(["ONE_TIME", "RECURRING", "DAILY_ELIGIBLE"]),
    priority: z
      .enum(["HIGH", "NORMAL", "SOMEDAY"])
      .default("NORMAL"),
    recurrenceInterval: z
      .number()
      .int()
      .min(1, "Recurrence interval must be at least 1 day")
      .max(365, "Recurrence interval cannot exceed 365 days")
      .nullable()
      .optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format")
      .nullable()
      .optional(),
    coinValue: z
      .number()
      .int()
      .min(1, "Coin value must be at least 1")
      .max(10, "Coin value cannot exceed 10")
      .default(1),
  })
  .refine(
    (data) => {
      if (data.type === "RECURRING" && !data.recurrenceInterval) {
        return false;
      }
      return true;
    },
    {
      message: "Recurring tasks must have a recurrence interval",
      path: ["recurrenceInterval"],
    }
  );

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

/**
 * Schema for updating an existing task.
 * All fields are optional — only provided fields are updated.
 */
export const UpdateTaskInputSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(255, "Title must be 255 characters or less")
      .optional(),
    topicId: z.string().uuid("Invalid topic ID").nullable().optional(),
    notes: z.string().nullable().optional(),
    type: z.enum(["ONE_TIME", "RECURRING", "DAILY_ELIGIBLE"]).optional(),
    priority: z.enum(["HIGH", "NORMAL", "SOMEDAY"]).optional(),
    recurrenceInterval: z
      .number()
      .int()
      .min(1)
      .max(365)
      .nullable()
      .optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format")
      .nullable()
      .optional(),
    coinValue: z.number().int().min(1).max(10).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "RECURRING" && data.recurrenceInterval === null) {
        return false;
      }
      return true;
    },
    {
      message: "Recurring tasks must have a recurrence interval",
      path: ["recurrenceInterval"],
    }
  );

export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

// ─── Topic Validators ─────────────────────────────────────────────────────────

/**
 * Schema for creating a new topic.
 */
export const CreateTopicInputSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g. #ff0000)")
    .nullable()
    .optional(),
  icon: z.string().nullable().optional(),
  priority: z
    .enum(["HIGH", "NORMAL", "SOMEDAY"])
    .default("NORMAL"),
});

export type CreateTopicInput = z.infer<typeof CreateTopicInputSchema>;

/**
 * Schema for updating an existing topic.
 * All fields are optional.
 */
export const UpdateTopicInputSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less")
    .optional(),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g. #ff0000)")
    .nullable()
    .optional(),
  icon: z.string().nullable().optional(),
  priority: z.enum(["HIGH", "NORMAL", "SOMEDAY"]).optional(),
});

export type UpdateTopicInput = z.infer<typeof UpdateTopicInputSchema>;
