/**
 * Zod validation schemas for Momo API inputs.
 *
 * All schemas are defined here and imported by API route handlers.
 * Each schema corresponds to a specific API operation.
 */

import { z } from "zod";

// ─── Shared Schemas ───────────────────────────────────────────────────────────

/**
 * Schema for an optional IANA timezone string.
 * Max 64 characters to prevent oversized input; mirrors the constraint used in
 * daily-quest/postpone and tasks/[id]/complete routes.
 */
export const TimezoneSchema = z.string().max(64).optional().nullable();

export type Timezone = z.infer<typeof TimezoneSchema>;

/**
 * Schema for an optional energy level (HIGH / MEDIUM / LOW).
 * Used on tasks (how much effort required) and for the daily energy check-in.
 */
export const EnergyLevelSchema = z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional();

export type EnergyLevel = z.infer<typeof EnergyLevelSchema>;

/**
 * Schema for the daily energy check-in.
 * User reports their current energy level before seeing the daily quest.
 */
export const EnergyCheckinSchema = z.object({
  energyLevel: z.enum(["HIGH", "MEDIUM", "LOW"]),
  timezone: TimezoneSchema,
});

export type EnergyCheckinInput = z.infer<typeof EnergyCheckinSchema>;

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
    notes: z.string().max(5000).nullable().optional(),
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
    /** Estimated completion time in minutes (5 / 15 / 30 / 60 / null = unknown) */
    estimatedMinutes: z
      .union([
        z.literal(5),
        z.literal(15),
        z.literal(30),
        z.literal(60),
      ])
      .nullable()
      .optional(),
    /** Energy level required (HIGH / MEDIUM / LOW / null = any) */
    energyLevel: EnergyLevelSchema,
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
    notes: z.string().max(5000).nullable().optional(),
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
    estimatedMinutes: z
      .union([z.literal(5), z.literal(15), z.literal(30), z.literal(60)])
      .nullable()
      .optional(),
    snoozedUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Snoozed until must be in YYYY-MM-DD format")
      .nullable()
      .optional(),
    /** Energy level required (HIGH / MEDIUM / LOW / null = any) */
    energyLevel: EnergyLevelSchema,
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

/**
 * Schema for snoozing a task.
 * Requires a future date in YYYY-MM-DD format.
 */
export const SnoozeTaskInputSchema = z.object({
  snoozedUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in YYYY-MM-DD format"),
});

export type SnoozeTaskInput = z.infer<typeof SnoozeTaskInputSchema>;

// ─── Topic Validators ─────────────────────────────────────────────────────────

/**
 * Schema for creating a new topic.
 */
export const CreateTopicInputSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z.string().max(5000).nullable().optional(),
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
  description: z.string().max(5000).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g. #ff0000)")
    .nullable()
    .optional(),
  icon: z.string().nullable().optional(),
  priority: z.enum(["HIGH", "NORMAL", "SOMEDAY"]).optional(),
});

export type UpdateTopicInput = z.infer<typeof UpdateTopicInputSchema>;

// ─── Wishlist Validators ───────────────────────────────────────────────────────

/**
 * Schema for creating a new wishlist item.
 * Validates title, optional price, optional URL, priority, and optional
 * coin-unlock threshold.
 *
 * Empty strings for url are coerced to undefined so the field is treated
 * as absent (avoids z.string().url() rejecting empty strings).
 */
export const CreateWishlistItemInputSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(999999, "Price is too large")
    .nullable()
    .optional(),
  url: z
    .preprocess(
      (val) => (val === "" ? undefined : val),
      z.string().url("URL must be a valid URL").optional()
    )
    .nullable()
    .optional(),
  priority: z.enum(["WANT", "NICE_TO_HAVE", "SOMEDAY"]),
  coinUnlockThreshold: z
    .number()
    .int()
    .min(0, "Coin threshold cannot be negative")
    .nullable()
    .optional(),
});

export type CreateWishlistItemInput = z.infer<
  typeof CreateWishlistItemInputSchema
>;

/**
 * Schema for updating an existing wishlist item.
 * All fields are optional — only provided fields are updated.
 */
export const UpdateWishlistItemInputSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(999999, "Price is too large")
    .nullable()
    .optional(),
  url: z
    .preprocess(
      (val) => (val === "" ? undefined : val),
      z.string().url("URL must be a valid URL").optional()
    )
    .nullable()
    .optional(),
  priority: z.enum(["WANT", "NICE_TO_HAVE", "SOMEDAY"]).optional(),
  coinUnlockThreshold: z
    .number()
    .int()
    .min(0, "Coin threshold cannot be negative")
    .nullable()
    .optional(),
});

export type UpdateWishlistItemInput = z.infer<
  typeof UpdateWishlistItemInputSchema
>;

/**
 * Schema for the budget update endpoint.
 */
export const UpdateBudgetInputSchema = z.object({
  budget: z
    .number()
    .min(0, "Budget cannot be negative")
    .max(9999999, "Budget is too large")
    .nullable(),
});

export type UpdateBudgetInput = z.infer<typeof UpdateBudgetInputSchema>;
