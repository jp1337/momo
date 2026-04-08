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

// ─── Reorder Validators ──────────────────────────────────────────────────────

/**
 * Schema for reordering tasks within a topic.
 * Accepts an ordered array of task UUIDs — the array index becomes the new sortOrder.
 */
export const ReorderTasksInputSchema = z.object({
  taskIds: z
    .array(z.string().uuid("Invalid task ID"))
    .min(1, "At least one task ID is required")
    .max(200, "Too many tasks"),
});

export type ReorderTasksInput = z.infer<typeof ReorderTasksInputSchema>;

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
  /**
   * Optional default energy level for tasks created in this topic.
   * New tasks inherit this when the user does not pick an explicit level.
   */
  defaultEnergyLevel: EnergyLevelSchema,
  /**
   * Sequential topics restrict daily quest selection to the first still-open
   * task (lowest sortOrder, not snoozed). Defaults to false.
   */
  sequential: z.boolean().optional().default(false),
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
  /** Optional default energy level — can be set to null to clear it. */
  defaultEnergyLevel: EnergyLevelSchema,
  /** Toggle sequential ordering enforcement for this topic. */
  sequential: z.boolean().optional(),
});

export type UpdateTopicInput = z.infer<typeof UpdateTopicInputSchema>;

/**
 * Schema for importing a topic from a predefined template.
 * The actual template content (title, tasks, icon, color, …) lives in
 * `lib/templates.ts`; this schema only validates the caller-supplied key.
 */
export const ImportTemplateInputSchema = z.object({
  templateKey: z.enum(["moving", "taxes", "fitness"]),
});

export type ImportTemplateInput = z.infer<typeof ImportTemplateInputSchema>;

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

// ─── Profile Validators ──────────────────────────────────────────────────────

/**
 * Schema for updating the user's profile.
 * All fields are optional — only provided fields are updated.
 * Image accepts a data URL (base64) or null to remove the profile picture.
 */
export const UpdateProfileInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name must not be empty")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Must be a valid email address")
    .max(255, "Email must be 255 characters or less")
    .optional(),
  image: z
    .string()
    .max(200_000, "Image data is too large")
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

// ─── Notification Channel Validators ─────────────────────────────────────────

/**
 * Config schema for the ntfy.sh notification channel.
 * Topic: alphanumeric with hyphens/underscores, required.
 * Server: optional URL, defaults to https://ntfy.sh when omitted.
 */
export const NtfyConfigSchema = z.object({
  topic: z
    .string()
    .min(1, "Topic is required")
    .max(200, "Topic must be 200 characters or less")
    .regex(
      /^[a-zA-Z0-9_\-]+$/,
      "Topic may only contain letters, numbers, hyphens, and underscores"
    ),
  server: z
    .preprocess(
      (val) => (val === "" ? undefined : val),
      z.string().url("Must be a valid URL").max(500).optional()
    ),
});

export type NtfyConfig = z.infer<typeof NtfyConfigSchema>;

/**
 * Config schema for the Pushover notification channel.
 * userKey: 30-character alphanumeric Pushover user key (required).
 * appToken: 30-character alphanumeric Pushover application API token (required).
 *
 * @see https://pushover.net/api
 */
export const PushoverConfigSchema = z.object({
  userKey: z
    .string()
    .min(1, "User key is required")
    .max(50, "User key must be 50 characters or less")
    .regex(
      /^[a-zA-Z0-9]+$/,
      "User key may only contain letters and numbers"
    ),
  appToken: z
    .string()
    .min(1, "App token is required")
    .max(50, "App token must be 50 characters or less")
    .regex(
      /^[a-zA-Z0-9]+$/,
      "App token may only contain letters and numbers"
    ),
});

export type PushoverConfig = z.infer<typeof PushoverConfigSchema>;

/**
 * Config schema for the Telegram notification channel.
 * botToken: Bot token from @BotFather, format `<bot_id>:<secret>` (required).
 * chatId:   Chat ID (numeric, optionally negative for groups/channels) (required).
 *
 * @see https://core.telegram.org/bots/api#sendmessage
 */
export const TelegramConfigSchema = z.object({
  botToken: z
    .string()
    .min(1, "Bot token is required")
    .max(100, "Bot token must be 100 characters or less")
    .regex(
      /^\d+:[A-Za-z0-9_-]{30,}$/,
      "Bot token must be in the format <bot_id>:<secret>"
    ),
  chatId: z
    .string()
    .min(1, "Chat ID is required")
    .max(32, "Chat ID must be 32 characters or less")
    .regex(/^-?\d+$/, "Chat ID must be a numeric ID (optionally negative)"),
});

export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;

/**
 * Config schema for the Email notification channel.
 * Per-user config holds only the destination address — SMTP credentials
 * are an instance-wide concern configured via env vars (SMTP_HOST, …).
 */
export const EmailConfigSchema = z.object({
  address: z
    .string()
    .min(1, "Email address is required")
    .max(254, "Email address must be 254 characters or less")
    .email("Must be a valid email address"),
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

/**
 * Discriminated union for upserting a notification channel.
 * Each channel type has its own config schema. New types are added here
 * as they are implemented (webhook is the remaining future channel).
 */
export const UpsertNotificationChannelSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ntfy"),
    config: NtfyConfigSchema,
    enabled: z.boolean().optional().default(true),
  }),
  z.object({
    type: z.literal("pushover"),
    config: PushoverConfigSchema,
    enabled: z.boolean().optional().default(true),
  }),
  z.object({
    type: z.literal("telegram"),
    config: TelegramConfigSchema,
    enabled: z.boolean().optional().default(true),
  }),
  z.object({
    type: z.literal("email"),
    config: EmailConfigSchema,
    enabled: z.boolean().optional().default(true),
  }),
]);

export type UpsertNotificationChannelInput = z.infer<
  typeof UpsertNotificationChannelSchema
>;

// ─── Two-Factor Authentication (TOTP) ─────────────────────────────────────────

/** Six-digit numeric TOTP code as displayed by an authenticator app. */
export const TotpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

export type TotpCodeInput = z.infer<typeof TotpCodeSchema>;

/** Ten-character alphanumeric backup code (uppercase letters + digits). */
export const TotpBackupCodeSchema = z.object({
  backupCode: z
    .string()
    .regex(/^[A-Z0-9]{10}$/, "Backup code must be 10 uppercase letters or digits"),
});

export type TotpBackupCodeInput = z.infer<typeof TotpBackupCodeSchema>;

/**
 * Login-time second-factor verification — accepts either a TOTP code OR a
 * backup code, but not both. Exactly one of `code` / `backupCode` must be
 * provided.
 */
export const TotpVerifyInputSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/).optional(),
    backupCode: z.string().regex(/^[A-Z0-9]{10}$/).optional(),
  })
  .refine((d) => !!d.code !== !!d.backupCode, {
    message: "Provide either a 6-digit code or a 10-character backup code",
  });

export type TotpVerifyInput = z.infer<typeof TotpVerifyInputSchema>;
