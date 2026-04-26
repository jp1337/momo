/**
 * Tests for lib/validators/index.ts
 *
 * Covers every exported Zod schema with:
 *  - valid input that should parse successfully
 *  - invalid input that should throw a ZodError
 *  - optional/nullable fields behavior
 *  - cross-field refinements (e.g. recurring task rules)
 *
 * Pure validation — no DB required.
 */

import { describe, it, expect } from "vitest";
import {
  TimezoneSchema,
  EnergyLevelSchema,
  EnergyCheckinSchema,
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  SnoozeTaskInputSchema,
  ReorderTasksInputSchema,
  BulkTaskActionInputSchema,
  CreateTopicInputSchema,
  UpdateTopicInputSchema,
  CreateWishlistItemInputSchema,
  UpdateWishlistItemInputSchema,
  UpdateBudgetInputSchema,
  UpdateProfileInputSchema,
  NtfyConfigSchema,
  PushoverConfigSchema,
  TelegramConfigSchema,
  EmailConfigSchema,
  WebhookConfigSchema,
  TotpCodeSchema,
  TotpBackupCodeSchema,
  TotpVerifyInputSchema,
  VacationModeInputSchema,
  PushNotificationTimeSchema,
} from "@/lib/validators/index";

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseFails(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown): void {
  const result = schema.safeParse(value);
  expect(result.success).toBe(false);
}

function parseSucceeds(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown): void {
  const result = schema.safeParse(value);
  expect(result.success).toBe(true);
}

// ─── TimezoneSchema ───────────────────────────────────────────────────────────

describe("TimezoneSchema", () => {
  it("accepts a valid timezone string", () => {
    parseSucceeds(TimezoneSchema, "Europe/Berlin");
  });

  it("accepts null", () => {
    parseSucceeds(TimezoneSchema, null);
  });

  it("accepts undefined (optional)", () => {
    parseSucceeds(TimezoneSchema, undefined);
  });

  it("rejects a string longer than 64 characters", () => {
    parseFails(TimezoneSchema, "A".repeat(65));
  });
});

// ─── EnergyLevelSchema ────────────────────────────────────────────────────────

describe("EnergyLevelSchema", () => {
  it("accepts HIGH", () => parseSucceeds(EnergyLevelSchema, "HIGH"));
  it("accepts MEDIUM", () => parseSucceeds(EnergyLevelSchema, "MEDIUM"));
  it("accepts LOW", () => parseSucceeds(EnergyLevelSchema, "LOW"));
  it("accepts null", () => parseSucceeds(EnergyLevelSchema, null));
  it("accepts undefined", () => parseSucceeds(EnergyLevelSchema, undefined));
  it("rejects unknown string", () => parseFails(EnergyLevelSchema, "EXTREME"));
  it("rejects lowercase variant", () => parseFails(EnergyLevelSchema, "high"));
});

// ─── EnergyCheckinSchema ─────────────────────────────────────────────────────

describe("EnergyCheckinSchema", () => {
  it("accepts a valid check-in", () => {
    parseSucceeds(EnergyCheckinSchema, { energyLevel: "HIGH", timezone: "UTC" });
  });

  it("accepts null timezone", () => {
    parseSucceeds(EnergyCheckinSchema, { energyLevel: "LOW", timezone: null });
  });

  it("rejects missing energyLevel", () => {
    parseFails(EnergyCheckinSchema, { timezone: "UTC" });
  });

  it("rejects invalid energyLevel", () => {
    parseFails(EnergyCheckinSchema, { energyLevel: "FULL", timezone: "UTC" });
  });
});

// ─── CreateTaskInputSchema ────────────────────────────────────────────────────

describe("CreateTaskInputSchema", () => {
  const validBase = {
    title: "Buy milk",
    type: "ONE_TIME" as const,
  };

  it("accepts minimal valid ONE_TIME task", () => {
    parseSucceeds(CreateTaskInputSchema, validBase);
  });

  it("accepts a ONE_TIME task with all optional fields", () => {
    parseSucceeds(CreateTaskInputSchema, {
      ...validBase,
      notes: "Don't forget oat milk",
      priority: "HIGH",
      dueDate: "2025-12-31",
      coinValue: 5,
      estimatedMinutes: 15,
      energyLevel: "LOW",
      taskGroup: "Shopping",
    });
  });

  it("accepts a RECURRING task with recurrenceInterval", () => {
    parseSucceeds(CreateTaskInputSchema, {
      title: "Morning run",
      type: "RECURRING",
      recurrenceInterval: 1,
    });
  });

  it("accepts a RECURRING WEEKDAY task with weekdays", () => {
    parseSucceeds(CreateTaskInputSchema, {
      title: "Stand-up",
      type: "RECURRING",
      recurrenceType: "WEEKDAY",
      recurrenceWeekdays: [0, 1, 2, 3, 4],
    });
  });

  it("accepts a DAILY_ELIGIBLE task", () => {
    parseSucceeds(CreateTaskInputSchema, {
      title: "Read a book chapter",
      type: "DAILY_ELIGIBLE",
    });
  });

  it("rejects an empty title", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, title: "" });
  });

  it("rejects a title exceeding 255 characters", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, title: "A".repeat(256) });
  });

  it("rejects an invalid type", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, type: "UNKNOWN" });
  });

  it("rejects coinValue below 1", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, coinValue: 0 });
  });

  it("rejects coinValue above 10", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, coinValue: 11 });
  });

  it("rejects invalid dueDate format", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, dueDate: "31-12-2025" });
  });

  it("rejects RECURRING task without recurrenceInterval when type is INTERVAL", () => {
    parseFails(CreateTaskInputSchema, {
      title: "No interval",
      type: "RECURRING",
      recurrenceType: "INTERVAL",
      recurrenceInterval: null,
    });
  });

  it("rejects RECURRING WEEKDAY task with empty weekdays array", () => {
    parseFails(CreateTaskInputSchema, {
      title: "No weekdays",
      type: "RECURRING",
      recurrenceType: "WEEKDAY",
      recurrenceWeekdays: [],
    });
  });

  it("rejects estimatedMinutes that is not in allowed set", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, estimatedMinutes: 45 });
  });

  it("accepts all valid estimatedMinutes values", () => {
    for (const mins of [5, 15, 30, 60]) {
      parseSucceeds(CreateTaskInputSchema, { ...validBase, estimatedMinutes: mins });
    }
  });

  it("rejects recurrenceInterval above 365", () => {
    parseFails(CreateTaskInputSchema, {
      title: "Too long",
      type: "RECURRING",
      recurrenceInterval: 366,
    });
  });

  it("rejects invalid topicId (not a UUID)", () => {
    parseFails(CreateTaskInputSchema, { ...validBase, topicId: "not-a-uuid" });
  });

  it("accepts null topicId", () => {
    parseSucceeds(CreateTaskInputSchema, { ...validBase, topicId: null });
  });

  it("applies default priority NORMAL when not provided", () => {
    const result = CreateTaskInputSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("NORMAL");
    }
  });
});

// ─── UpdateTaskInputSchema ────────────────────────────────────────────────────

describe("UpdateTaskInputSchema", () => {
  it("accepts an empty object (all optional)", () => {
    parseSucceeds(UpdateTaskInputSchema, {});
  });

  it("accepts a partial update with just title", () => {
    parseSucceeds(UpdateTaskInputSchema, { title: "Updated title" });
  });

  it("accepts updating priority", () => {
    parseSucceeds(UpdateTaskInputSchema, { priority: "SOMEDAY" });
  });

  it("rejects empty string title", () => {
    parseFails(UpdateTaskInputSchema, { title: "" });
  });

  it("rejects invalid dueDate format", () => {
    parseFails(UpdateTaskInputSchema, { dueDate: "2025/12/31" });
  });

  it("rejects invalid snoozedUntil format", () => {
    parseFails(UpdateTaskInputSchema, { snoozedUntil: "tomorrow" });
  });

  it("accepts valid snoozedUntil date", () => {
    parseSucceeds(UpdateTaskInputSchema, { snoozedUntil: "2025-06-15" });
  });

  it("accepts null snoozedUntil (unsnooze)", () => {
    parseSucceeds(UpdateTaskInputSchema, { snoozedUntil: null });
  });

  it("rejects RECURRING with explicit null recurrenceInterval and INTERVAL type", () => {
    parseFails(UpdateTaskInputSchema, {
      type: "RECURRING",
      recurrenceType: "INTERVAL",
      recurrenceInterval: null,
    });
  });

  it("rejects RECURRING with WEEKDAY type and empty weekdays array", () => {
    parseFails(UpdateTaskInputSchema, {
      type: "RECURRING",
      recurrenceType: "WEEKDAY",
      recurrenceWeekdays: [],
    });
  });

  it("accepts RECURRING with WEEKDAY type and at least one weekday", () => {
    parseSucceeds(UpdateTaskInputSchema, {
      type: "RECURRING",
      recurrenceType: "WEEKDAY",
      recurrenceWeekdays: [0, 4], // Monday and Friday
    });
  });
});

// ─── SnoozeTaskInputSchema ────────────────────────────────────────────────────

describe("SnoozeTaskInputSchema", () => {
  it("accepts a valid date string", () => {
    parseSucceeds(SnoozeTaskInputSchema, { snoozedUntil: "2025-08-01" });
  });

  it("rejects missing snoozedUntil", () => {
    parseFails(SnoozeTaskInputSchema, {});
  });

  it("rejects invalid date format", () => {
    parseFails(SnoozeTaskInputSchema, { snoozedUntil: "01-08-2025" });
  });

  it("rejects non-date string", () => {
    parseFails(SnoozeTaskInputSchema, { snoozedUntil: "tomorrow" });
  });
});

// ─── ReorderTasksInputSchema ──────────────────────────────────────────────────

describe("ReorderTasksInputSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts an array of valid UUIDs", () => {
    parseSucceeds(ReorderTasksInputSchema, { taskIds: [uuid, uuid] });
  });

  it("rejects an empty array", () => {
    parseFails(ReorderTasksInputSchema, { taskIds: [] });
  });

  it("rejects non-UUID strings in the array", () => {
    parseFails(ReorderTasksInputSchema, { taskIds: ["not-a-uuid"] });
  });

  it("rejects more than 200 tasks", () => {
    parseFails(ReorderTasksInputSchema, { taskIds: Array(201).fill(uuid) });
  });

  it("accepts exactly 200 tasks", () => {
    parseSucceeds(ReorderTasksInputSchema, { taskIds: Array(200).fill(uuid) });
  });
});

// ─── BulkTaskActionInputSchema ────────────────────────────────────────────────

describe("BulkTaskActionInputSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a valid delete action", () => {
    parseSucceeds(BulkTaskActionInputSchema, { action: "delete", taskIds: [uuid] });
  });

  it("accepts a valid complete action with timezone", () => {
    parseSucceeds(BulkTaskActionInputSchema, {
      action: "complete",
      taskIds: [uuid],
      timezone: "Europe/Berlin",
    });
  });

  it("accepts a valid changeTopic action", () => {
    parseSucceeds(BulkTaskActionInputSchema, {
      action: "changeTopic",
      taskIds: [uuid],
      topicId: uuid,
    });
  });

  it("accepts changeTopic with null topicId (unassign)", () => {
    parseSucceeds(BulkTaskActionInputSchema, {
      action: "changeTopic",
      taskIds: [uuid],
      topicId: null,
    });
  });

  it("accepts a valid setPriority action", () => {
    parseSucceeds(BulkTaskActionInputSchema, {
      action: "setPriority",
      taskIds: [uuid],
      priority: "HIGH",
    });
  });

  it("rejects an unknown action", () => {
    parseFails(BulkTaskActionInputSchema, { action: "archive", taskIds: [uuid] });
  });

  it("rejects empty taskIds array", () => {
    parseFails(BulkTaskActionInputSchema, { action: "delete", taskIds: [] });
  });

  it("rejects more than 100 taskIds", () => {
    parseFails(BulkTaskActionInputSchema, {
      action: "delete",
      taskIds: Array(101).fill(uuid),
    });
  });

  it("rejects invalid priority in setPriority", () => {
    parseFails(BulkTaskActionInputSchema, {
      action: "setPriority",
      taskIds: [uuid],
      priority: "URGENT",
    });
  });
});

// ─── CreateTopicInputSchema ───────────────────────────────────────────────────

describe("CreateTopicInputSchema", () => {
  it("accepts a minimal valid topic", () => {
    parseSucceeds(CreateTopicInputSchema, { title: "Work" });
  });

  it("accepts topic with all optional fields", () => {
    parseSucceeds(CreateTopicInputSchema, {
      title: "Health",
      description: "Fitness and wellness goals",
      color: "#4a7c59",
      icon: "heart",
      priority: "HIGH",
      defaultEnergyLevel: "HIGH",
      sequential: true,
    });
  });

  it("rejects empty title", () => {
    parseFails(CreateTopicInputSchema, { title: "" });
  });

  it("rejects title over 100 characters", () => {
    parseFails(CreateTopicInputSchema, { title: "A".repeat(101) });
  });

  it("rejects invalid hex color", () => {
    parseFails(CreateTopicInputSchema, { title: "Work", color: "red" });
  });

  it("accepts valid hex color", () => {
    parseSucceeds(CreateTopicInputSchema, { title: "Work", color: "#ff0000" });
  });

  it("rejects invalid priority", () => {
    parseFails(CreateTopicInputSchema, { title: "Work", priority: "URGENT" });
  });

  it("applies default priority NORMAL", () => {
    const result = CreateTopicInputSchema.safeParse({ title: "Work" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("NORMAL");
    }
  });

  it("applies default sequential false", () => {
    const result = CreateTopicInputSchema.safeParse({ title: "Work" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sequential).toBe(false);
    }
  });
});

// ─── UpdateTopicInputSchema ───────────────────────────────────────────────────

describe("UpdateTopicInputSchema", () => {
  it("accepts an empty object (all optional)", () => {
    parseSucceeds(UpdateTopicInputSchema, {});
  });

  it("accepts partial update with title only", () => {
    parseSucceeds(UpdateTopicInputSchema, { title: "Updated" });
  });

  it("accepts archiving a topic", () => {
    parseSucceeds(UpdateTopicInputSchema, { archived: true });
  });

  it("rejects invalid color format", () => {
    parseFails(UpdateTopicInputSchema, { color: "#xyz" });
  });
});

// ─── CreateWishlistItemInputSchema ────────────────────────────────────────────

describe("CreateWishlistItemInputSchema", () => {
  it("accepts a minimal valid item", () => {
    parseSucceeds(CreateWishlistItemInputSchema, { title: "New headphones", priority: "WANT" });
  });

  it("accepts item with all optional fields", () => {
    parseSucceeds(CreateWishlistItemInputSchema, {
      title: "Mechanical keyboard",
      price: 149.99,
      url: "https://example.com/keyboard",
      priority: "NICE_TO_HAVE",
      coinUnlockThreshold: 50,
    });
  });

  it("rejects empty title", () => {
    parseFails(CreateWishlistItemInputSchema, { title: "", priority: "WANT" });
  });

  it("rejects title over 200 characters", () => {
    parseFails(CreateWishlistItemInputSchema, { title: "A".repeat(201), priority: "WANT" });
  });

  it("rejects negative price", () => {
    parseFails(CreateWishlistItemInputSchema, { title: "Item", priority: "WANT", price: -1 });
  });

  it("rejects invalid URL", () => {
    parseFails(CreateWishlistItemInputSchema, { title: "Item", priority: "WANT", url: "not-a-url" });
  });

  it("accepts empty string URL (coerced to undefined)", () => {
    parseSucceeds(CreateWishlistItemInputSchema, { title: "Item", priority: "WANT", url: "" });
  });

  it("rejects unknown priority", () => {
    parseFails(CreateWishlistItemInputSchema, { title: "Item", priority: "MAYBE" });
  });

  it("rejects negative coinUnlockThreshold", () => {
    parseFails(CreateWishlistItemInputSchema, {
      title: "Item",
      priority: "WANT",
      coinUnlockThreshold: -1,
    });
  });
});

// ─── UpdateWishlistItemInputSchema ────────────────────────────────────────────

describe("UpdateWishlistItemInputSchema", () => {
  it("accepts an empty object", () => {
    parseSucceeds(UpdateWishlistItemInputSchema, {});
  });

  it("accepts partial update with price only", () => {
    parseSucceeds(UpdateWishlistItemInputSchema, { price: 99.95 });
  });

  it("rejects empty title string", () => {
    parseFails(UpdateWishlistItemInputSchema, { title: "" });
  });

  it("accepts null price (clear price)", () => {
    parseSucceeds(UpdateWishlistItemInputSchema, { price: null });
  });

  it("coerces empty string URL to undefined (treated as absent)", () => {
    const result = UpdateWishlistItemInputSchema.safeParse({ url: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeUndefined();
    }
  });

  it("accepts a valid URL string", () => {
    parseSucceeds(UpdateWishlistItemInputSchema, { url: "https://example.com/item" });
  });

  it("rejects an invalid URL string", () => {
    parseFails(UpdateWishlistItemInputSchema, { url: "not-a-url" });
  });
});

// ─── UpdateBudgetInputSchema ──────────────────────────────────────────────────

describe("UpdateBudgetInputSchema", () => {
  it("accepts a valid budget number", () => {
    parseSucceeds(UpdateBudgetInputSchema, { budget: 500 });
  });

  it("accepts zero budget", () => {
    parseSucceeds(UpdateBudgetInputSchema, { budget: 0 });
  });

  it("accepts null budget (clear budget)", () => {
    parseSucceeds(UpdateBudgetInputSchema, { budget: null });
  });

  it("rejects negative budget", () => {
    parseFails(UpdateBudgetInputSchema, { budget: -1 });
  });

  it("rejects missing budget field", () => {
    parseFails(UpdateBudgetInputSchema, {});
  });
});

// ─── UpdateProfileInputSchema ─────────────────────────────────────────────────

describe("UpdateProfileInputSchema", () => {
  it("accepts an empty object (all optional)", () => {
    parseSucceeds(UpdateProfileInputSchema, {});
  });

  it("accepts a valid name update", () => {
    parseSucceeds(UpdateProfileInputSchema, { name: "Alice" });
  });

  it("accepts a valid email update", () => {
    parseSucceeds(UpdateProfileInputSchema, { email: "alice@example.com" });
  });

  it("accepts null image (remove profile picture)", () => {
    parseSucceeds(UpdateProfileInputSchema, { image: null });
  });

  it("rejects empty name after trimming", () => {
    parseFails(UpdateProfileInputSchema, { name: "   " });
  });

  it("rejects invalid email", () => {
    parseFails(UpdateProfileInputSchema, { email: "not-an-email" });
  });

  it("rejects name over 100 characters", () => {
    parseFails(UpdateProfileInputSchema, { name: "A".repeat(101) });
  });
});

// ─── NtfyConfigSchema ─────────────────────────────────────────────────────────

describe("NtfyConfigSchema", () => {
  it("accepts a valid topic-only config", () => {
    parseSucceeds(NtfyConfigSchema, { topic: "my-alerts" });
  });

  it("accepts a config with custom server", () => {
    parseSucceeds(NtfyConfigSchema, {
      topic: "alerts",
      server: "https://ntfy.example.com",
    });
  });

  it("rejects empty topic", () => {
    parseFails(NtfyConfigSchema, { topic: "" });
  });

  it("rejects topic with invalid characters (spaces)", () => {
    parseFails(NtfyConfigSchema, { topic: "my alerts" });
  });

  it("rejects invalid server URL", () => {
    parseFails(NtfyConfigSchema, { topic: "alerts", server: "not-a-url" });
  });

  it("accepts empty string server (coerced to undefined)", () => {
    parseSucceeds(NtfyConfigSchema, { topic: "alerts", server: "" });
  });
});

// ─── PushoverConfigSchema ─────────────────────────────────────────────────────

describe("PushoverConfigSchema", () => {
  it("accepts valid user key and app token", () => {
    parseSucceeds(PushoverConfigSchema, {
      userKey: "abc123ABC456abc123ABC456abc123",
      appToken: "xyz789XYZ012xyz789XYZ012xyz789",
    });
  });

  it("rejects empty userKey", () => {
    parseFails(PushoverConfigSchema, { userKey: "", appToken: "validToken123" });
  });

  it("rejects userKey with non-alphanumeric characters", () => {
    parseFails(PushoverConfigSchema, { userKey: "key-with-dash", appToken: "validToken123" });
  });

  it("rejects missing appToken", () => {
    parseFails(PushoverConfigSchema, { userKey: "validKey123" });
  });
});

// ─── TelegramConfigSchema ─────────────────────────────────────────────────────

describe("TelegramConfigSchema", () => {
  it("accepts valid bot token and chat ID", () => {
    parseSucceeds(TelegramConfigSchema, {
      botToken: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg",
      chatId: "-1001234567890",
    });
  });

  it("rejects invalid bot token format", () => {
    parseFails(TelegramConfigSchema, {
      botToken: "invalid-token",
      chatId: "12345",
    });
  });

  it("rejects non-numeric chatId", () => {
    parseFails(TelegramConfigSchema, {
      botToken: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg",
      chatId: "my-chat",
    });
  });

  it("accepts positive chatId", () => {
    parseSucceeds(TelegramConfigSchema, {
      botToken: "987654321:ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvuts",
      chatId: "1234567890",
    });
  });
});

// ─── EmailConfigSchema ────────────────────────────────────────────────────────

describe("EmailConfigSchema", () => {
  it("accepts a valid email address", () => {
    parseSucceeds(EmailConfigSchema, { address: "user@example.com" });
  });

  it("rejects an invalid email address", () => {
    parseFails(EmailConfigSchema, { address: "not-an-email" });
  });

  it("rejects an empty address", () => {
    parseFails(EmailConfigSchema, { address: "" });
  });

  it("rejects missing address", () => {
    parseFails(EmailConfigSchema, {});
  });
});

// ─── WebhookConfigSchema ──────────────────────────────────────────────────────

describe("WebhookConfigSchema", () => {
  it("accepts a valid HTTPS URL", () => {
    parseSucceeds(WebhookConfigSchema, { url: "https://example.com/webhook" });
  });

  it("accepts HTTPS URL with optional secret", () => {
    parseSucceeds(WebhookConfigSchema, {
      url: "https://example.com/webhook",
      secret: "my-signing-secret",
    });
  });

  it("rejects HTTP URL (must be HTTPS)", () => {
    parseFails(WebhookConfigSchema, { url: "http://example.com/webhook" });
  });

  it("rejects invalid URL", () => {
    parseFails(WebhookConfigSchema, { url: "not-a-url" });
  });

  it("rejects missing URL", () => {
    parseFails(WebhookConfigSchema, {});
  });

  it("rejects secret exceeding 200 characters", () => {
    parseFails(WebhookConfigSchema, {
      url: "https://example.com/webhook",
      secret: "s".repeat(201),
    });
  });
});

// ─── TotpCodeSchema ───────────────────────────────────────────────────────────

describe("TotpCodeSchema", () => {
  it("accepts a 6-digit code", () => {
    parseSucceeds(TotpCodeSchema, { code: "123456" });
  });

  it("accepts all-zeros code", () => {
    parseSucceeds(TotpCodeSchema, { code: "000000" });
  });

  it("rejects a 5-digit code", () => {
    parseFails(TotpCodeSchema, { code: "12345" });
  });

  it("rejects a 7-digit code", () => {
    parseFails(TotpCodeSchema, { code: "1234567" });
  });

  it("rejects alphabetic characters", () => {
    parseFails(TotpCodeSchema, { code: "abcdef" });
  });

  it("rejects missing code", () => {
    parseFails(TotpCodeSchema, {});
  });
});

// ─── TotpBackupCodeSchema ─────────────────────────────────────────────────────

describe("TotpBackupCodeSchema", () => {
  it("accepts a valid 10-char uppercase alphanumeric backup code", () => {
    parseSucceeds(TotpBackupCodeSchema, { backupCode: "AB12CD34EF" });
  });

  it("rejects lowercase letters", () => {
    parseFails(TotpBackupCodeSchema, { backupCode: "ab12cd34ef" });
  });

  it("rejects a code shorter than 10 characters", () => {
    parseFails(TotpBackupCodeSchema, { backupCode: "ABCD1234" });
  });

  it("rejects a code longer than 10 characters", () => {
    parseFails(TotpBackupCodeSchema, { backupCode: "ABCDE12345X" });
  });

  it("rejects special characters", () => {
    parseFails(TotpBackupCodeSchema, { backupCode: "ABCDE1234!" });
  });
});

// ─── TotpVerifyInputSchema ────────────────────────────────────────────────────

describe("TotpVerifyInputSchema", () => {
  it("accepts a code-only input", () => {
    parseSucceeds(TotpVerifyInputSchema, { code: "123456" });
  });

  it("accepts a backupCode-only input", () => {
    parseSucceeds(TotpVerifyInputSchema, { backupCode: "AB12CD34EF" });
  });

  it("rejects providing both code and backupCode", () => {
    parseFails(TotpVerifyInputSchema, { code: "123456", backupCode: "AB12CD34EF" });
  });

  it("rejects providing neither code nor backupCode", () => {
    parseFails(TotpVerifyInputSchema, {});
  });
});

// ─── VacationModeInputSchema ──────────────────────────────────────────────────

describe("VacationModeInputSchema", () => {
  it("accepts valid activation with endDate", () => {
    parseSucceeds(VacationModeInputSchema, {
      active: true,
      endDate: "2025-08-31",
      timezone: "Europe/Berlin",
    });
  });

  it("accepts deactivation without endDate", () => {
    parseSucceeds(VacationModeInputSchema, { active: false });
  });

  it("rejects activation without endDate", () => {
    parseFails(VacationModeInputSchema, { active: true });
  });

  it("rejects invalid endDate format", () => {
    parseFails(VacationModeInputSchema, { active: true, endDate: "08-31-2025" });
  });

  it("accepts activation with null timezone", () => {
    parseSucceeds(VacationModeInputSchema, {
      active: true,
      endDate: "2025-09-01",
      timezone: null,
    });
  });
});

// ─── PushNotificationTimeSchema ───────────────────────────────────────────────

describe("PushNotificationTimeSchema", () => {
  it("accepts a valid HH:MM time at midnight", () => {
    parseSucceeds(PushNotificationTimeSchema, "00:00");
  });

  it("accepts a valid HH:MM time at last valid minute", () => {
    parseSucceeds(PushNotificationTimeSchema, "23:59");
  });

  it("accepts a mid-day time", () => {
    parseSucceeds(PushNotificationTimeSchema, "12:30");
  });

  it("accepts HH:MM:SS format and strips seconds", () => {
    const result = PushNotificationTimeSchema.safeParse("07:45:00");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("07:45");
  });

  it("rejects hour 24 (out of range)", () => {
    parseFails(PushNotificationTimeSchema, "24:00");
  });

  it("rejects minute 60 (out of range)", () => {
    parseFails(PushNotificationTimeSchema, "12:60");
  });

  it("rejects hour 25 and minute 99 (both out of range)", () => {
    parseFails(PushNotificationTimeSchema, "25:99");
  });

  it("rejects hour 99", () => {
    parseFails(PushNotificationTimeSchema, "99:00");
  });

  it("rejects single-digit hour without zero-padding", () => {
    parseFails(PushNotificationTimeSchema, "7:30");
  });

  it("rejects a plain number string", () => {
    parseFails(PushNotificationTimeSchema, "1230");
  });

  it("rejects an empty string", () => {
    parseFails(PushNotificationTimeSchema, "");
  });

  it("rejects a non-string value", () => {
    parseFails(PushNotificationTimeSchema, 730);
  });

  it("transforms '23:59:59' to '23:59'", () => {
    const result = PushNotificationTimeSchema.safeParse("23:59:59");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("23:59");
  });
});
