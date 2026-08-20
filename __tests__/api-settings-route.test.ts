/**
 * Integration tests for the settings API routes.
 *
 * Covers:
 *   GET/PATCH /api/settings/quest
 *   GET/PATCH /api/settings/timezone
 *   GET/PATCH /api/settings/vacation-mode
 *   GET/PATCH /api/settings/budget
 *   GET/PATCH /api/settings/login-notification
 *   GET       /api/settings/notification-history
 *   GET/POST/DELETE /api/settings/calendar-feed
 *   GET/PUT   /api/settings/notification-channels
 *   DELETE    /api/settings/notification-channels/:type
 *   POST      /api/settings/notification-channels/:type/test
 *   GET/POST  /api/settings/webhooks
 *   GET/PATCH/DELETE /api/settings/webhooks/:id
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn(),
  resolveVerifiedApiUser: vi.fn(),
  resolveSessionOnlyApiUser: vi.fn(),
  readonlyKeyResponse: () =>
    Response.json(
      { error: "Forbidden", message: "This API key is read-only." },
      { status: 403 }
    ),
  // Mirrors the real helper's per-reason status codes closely enough for
  // route-level tests: BEARER_SESSION_REQUIRED is a 403 (the caller is
  // refused because of *how* it authenticated, not because credentials are
  // missing/invalid), every other reason is a 401.
  verifiedAuthErrorResponse: (reason: string) =>
    Response.json(
      { error: reason, code: reason },
      { status: reason === "BEARER_SESSION_REQUIRED" ? 403 : 401 }
    ),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Mock lib/notifications sendTestNotification
vi.mock("@/lib/notifications", async (orig) => {
  const actual = await orig<typeof import("@/lib/notifications")>();
  return {
    ...actual,
    sendTestNotification: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("@/lib/wishlist", async (orig) => {
  const actual = await orig<typeof import("@/lib/wishlist")>();
  return {
    ...actual,
    getBudgetSummary: vi.fn(actual.getBudgetSummary),
    updateMonthlyBudget: vi.fn(actual.updateMonthlyBudget),
  };
});

vi.mock("@/lib/vacation", async (orig) => {
  const actual = await orig<typeof import("@/lib/vacation")>();
  return {
    ...actual,
    getVacationStatus: vi.fn(actual.getVacationStatus),
    activateVacationMode: vi.fn(actual.activateVacationMode),
    deactivateVacationMode: vi.fn(actual.deactivateVacationMode),
  };
});

vi.mock("@/lib/calendar", async (orig) => {
  const actual = await orig<typeof import("@/lib/calendar")>();
  return {
    ...actual,
    createOrRotateCalendarToken: vi.fn(actual.createOrRotateCalendarToken),
    revokeCalendarToken: vi.fn(actual.revokeCalendarToken),
  };
});

vi.mock("@/lib/webhooks", async (orig) => {
  const actual = await orig<typeof import("@/lib/webhooks")>();
  return {
    ...actual,
    listWebhookEndpoints: vi.fn(actual.listWebhookEndpoints),
    createWebhookEndpoint: vi.fn(actual.createWebhookEndpoint),
  };
});

import {
  resolveApiUser,
  resolveVerifiedApiUser,
  resolveSessionOnlyApiUser,
} from "@/lib/api-auth";
import { GET as questGET, PATCH as questPATCH } from "@/app/api/settings/quest/route";
import { GET as timezoneGET, PATCH as timezonePATCH } from "@/app/api/settings/timezone/route";
import { GET as vacationGET, PATCH as vacationPATCH } from "@/app/api/settings/vacation-mode/route";
import { GET as budgetGET, PATCH as budgetPATCH } from "@/app/api/settings/budget/route";
import { getBudgetSummary, updateMonthlyBudget } from "@/lib/wishlist";
import { getVacationStatus, activateVacationMode, deactivateVacationMode } from "@/lib/vacation";
import { createOrRotateCalendarToken, revokeCalendarToken } from "@/lib/calendar";
import { listWebhookEndpoints, createWebhookEndpoint } from "@/lib/webhooks";
import { GET as loginNotifGET, PATCH as loginNotifPATCH } from "@/app/api/settings/login-notification/route";
import { GET as notifHistoryGET } from "@/app/api/settings/notification-history/route";
import { GET as calendarGET, POST as calendarPOST, DELETE as calendarDELETE } from "@/app/api/settings/calendar-feed/route";
import { GET as channelsGET, PUT as channelsPUT } from "@/app/api/settings/notification-channels/route";
import { DELETE as channelTypeDELETE } from "@/app/api/settings/notification-channels/[type]/route";
import { POST as channelTypeTestPOST } from "@/app/api/settings/notification-channels/[type]/test/route";
import { GET as webhooksGET, POST as webhooksPOST } from "@/app/api/settings/webhooks/route";
import {
  GET as webhookByIdGET,
  PATCH as webhookByIdPATCH,
  DELETE as webhookByIdDELETE,
} from "@/app/api/settings/webhooks/[id]/route";
import { createTestUser } from "./helpers/fixtures";
import { db } from "@/lib/db";
import * as rateLimitLib from "@/lib/rate-limit";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);
const mockVerifiedAuth = vi.mocked(resolveVerifiedApiUser);
const mockSessionOnlyAuth = vi.mocked(resolveSessionOnlyApiUser);

beforeEach(() => {
  mockAuth.mockReset();
  mockVerifiedAuth.mockReset();
  mockSessionOnlyAuth.mockReset();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(method: string, url: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function asUser(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

// asVerifiedUser/asVerifiedUserFailed drive BOTH resolveVerifiedApiUser (used
// by session-or-bearer endpoints, e.g. calendar-feed GET) and
// resolveSessionOnlyApiUser (used by session-ONLY endpoints, e.g.
// calendar-feed POST/DELETE) with the same outcome, since for a real cookie
// session the two resolvers agree. Bearer-specific refusal scenarios set
// mockSessionOnlyAuth directly instead of going through these helpers.
function asVerifiedUser(userId: string): void {
  const result = { ok: true as const, user: { userId, readonly: false } };
  mockVerifiedAuth.mockResolvedValue(result);
  mockSessionOnlyAuth.mockResolvedValue(result);
}

function asVerifiedUserFailed(reason: "UNAUTHORIZED" | "TOTP_REQUIRED" | "TOTP_SETUP_REQUIRED" = "UNAUTHORIZED"): void {
  const result = { ok: false as const, reason };
  mockVerifiedAuth.mockResolvedValue(result);
  mockSessionOnlyAuth.mockResolvedValue(result);
}

// ─── GET/PATCH /api/settings/quest ───────────────────────────────────────────

describe("GET /api/settings/quest", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await questGET(req("GET", "/api/settings/quest") as never);
    expect(res.status).toBe(401);
  });

  it("returns quest settings for authenticated user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await questGET(req("GET", "/api/settings/quest") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("postponeLimit");
    expect(body).toHaveProperty("emotionalClosureEnabled");
  });
});

describe("PATCH /api/settings/quest", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await questPATCH(
      req("PATCH", "/api/settings/quest", { postponeLimit: 3 }) as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await questPATCH(
      req("PATCH", "/api/settings/quest", { postponeLimit: 3 }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid postponeLimit", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await questPATCH(
      req("PATCH", "/api/settings/quest", { postponeLimit: 10 }) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when no field is provided", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await questPATCH(
      req("PATCH", "/api/settings/quest", {}) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 when updating postponeLimit", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await questPATCH(
      req("PATCH", "/api/settings/quest", { postponeLimit: 3 }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when toggling emotionalClosureEnabled", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await questPATCH(
      req("PATCH", "/api/settings/quest", { emotionalClosureEnabled: true }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── GET /api/settings/quest — 500 error path ────────────────────────────────

describe("GET /api/settings/quest — 500 error path", () => {
  it("returns 500 when db query throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await questGET(req("GET", "/api/settings/quest") as never);
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── PATCH /api/settings/quest — 500 error path ──────────────────────────────

describe("PATCH /api/settings/quest — 500 error path", () => {
  it("returns 500 when db update throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "update").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await questPATCH(
      req("PATCH", "/api/settings/quest", { postponeLimit: 3 }) as never
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── GET/PATCH /api/settings/timezone ────────────────────────────────────────

describe("GET /api/settings/timezone", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await timezoneGET(req("GET", "/api/settings/timezone"));
    expect(res.status).toBe(401);
  });

  it("returns timezone for authenticated user", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asUser(user.id);
    const res = await timezoneGET(req("GET", "/api/settings/timezone"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("timezone");
  });
});

describe("PATCH /api/settings/timezone", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await timezonePATCH(
      req("PATCH", "/api/settings/timezone", { timezone: "Europe/Berlin" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await timezonePATCH(
      req("PATCH", "/api/settings/timezone", { timezone: "Europe/Berlin" })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid timezone", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await timezonePATCH(
      req("PATCH", "/api/settings/timezone", { timezone: "Not/A/Valid/Timezone" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 with valid IANA timezone", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await timezonePATCH(
      req("PATCH", "/api/settings/timezone", { timezone: "America/New_York" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── GET /api/settings/timezone — 500 error path ─────────────────────────────

describe("GET /api/settings/timezone — 500 error path", () => {
  it("returns 500 when db query throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await timezoneGET(req("GET", "/api/settings/timezone"));
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── PATCH /api/settings/timezone — 500 error path ───────────────────────────

describe("PATCH /api/settings/timezone — 500 error path", () => {
  it("returns 500 when db update throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "update").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await timezonePATCH(
      req("PATCH", "/api/settings/timezone", { timezone: "Europe/Berlin" })
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── GET/PATCH /api/settings/vacation-mode ───────────────────────────────────

describe("GET /api/settings/vacation-mode", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await vacationGET(req("GET", "/api/settings/vacation-mode"));
    expect(res.status).toBe(401);
  });

  it("returns vacation status for authenticated user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await vacationGET(req("GET", "/api/settings/vacation-mode"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("active");
  });
});

describe("PATCH /api/settings/vacation-mode", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await vacationPATCH(
      req("PATCH", "/api/settings/vacation-mode", { active: false })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await vacationPATCH(
      req("PATCH", "/api/settings/vacation-mode", { active: false })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when active=true but no endDate", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await vacationPATCH(
      req("PATCH", "/api/settings/vacation-mode", { active: true })
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 when deactivating vacation mode", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await vacationPATCH(
      req("PATCH", "/api/settings/vacation-mode", {
        active: false,
        timezone: "Europe/Berlin",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when activating vacation mode with a valid endDate", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const endDate = futureDate.toISOString().slice(0, 10);
    const res = await vacationPATCH(
      req("PATCH", "/api/settings/vacation-mode", {
        active: true,
        endDate,
        timezone: "Europe/Berlin",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── GET/PATCH /api/settings/budget ──────────────────────────────────────────

describe("GET /api/settings/budget", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await budgetGET(req("GET", "/api/settings/budget"));
    expect(res.status).toBe(401);
  });

  it("returns budget summary for authenticated user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await budgetGET(req("GET", "/api/settings/budget"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("budget");
  });
});

describe("PATCH /api/settings/budget", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await budgetPATCH(
      req("PATCH", "/api/settings/budget", { budget: 100 })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await budgetPATCH(
      req("PATCH", "/api/settings/budget", { budget: 100 })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid budget value", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await budgetPATCH(
      req("PATCH", "/api/settings/budget", { budget: -1 })
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when budget field is missing", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await budgetPATCH(
      req("PATCH", "/api/settings/budget", {})
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 when setting a valid budget", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await budgetPATCH(
      req("PATCH", "/api/settings/budget", { budget: 500 })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when clearing the budget with null", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await budgetPATCH(
      req("PATCH", "/api/settings/budget", { budget: null })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const badReq = new Request("http://localhost/api/settings/budget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });
    const res = await budgetPATCH(badReq as never);
    expect(res.status).toBe(400);
  });

  it("returns 500 when updateMonthlyBudget throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    vi.mocked(updateMonthlyBudget).mockRejectedValueOnce(new Error("DB error"));
    const res = await budgetPATCH(req("PATCH", "/api/settings/budget", { budget: 100 }));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/settings/budget — error path", () => {
  it("returns 500 when getBudgetSummary throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    vi.mocked(getBudgetSummary).mockRejectedValueOnce(new Error("DB error"));
    const res = await budgetGET(req("GET", "/api/settings/budget"));
    expect(res.status).toBe(500);
  });
});

// ─── GET/PATCH /api/settings/login-notification ───────────────────────────────

describe("GET /api/settings/login-notification", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await loginNotifGET(req("GET", "/api/settings/login-notification"));
    expect(res.status).toBe(401);
  });

  it("returns login notification setting for authenticated user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await loginNotifGET(req("GET", "/api/settings/login-notification"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("enabled");
    expect(typeof body.enabled).toBe("boolean");
  });
});

describe("PATCH /api/settings/login-notification", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await loginNotifPATCH(
      req("PATCH", "/api/settings/login-notification", { enabled: true })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await loginNotifPATCH(
      req("PATCH", "/api/settings/login-notification", { enabled: true })
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when enabled is not a boolean", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await loginNotifPATCH(
      req("PATCH", "/api/settings/login-notification", { enabled: "yes" })
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 when enabling login notifications", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await loginNotifPATCH(
      req("PATCH", "/api/settings/login-notification", { enabled: true })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  it("returns 200 when disabling login notifications", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await loginNotifPATCH(
      req("PATCH", "/api/settings/login-notification", { enabled: false })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
  });
});

// ─── GET /api/settings/notification-history ──────────────────────────────────

describe("GET /api/settings/notification-history", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await notifHistoryGET(req("GET", "/api/settings/notification-history") as never);
    expect(res.status).toBe(401);
  });

  it("returns entries array for authenticated user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await notifHistoryGET(req("GET", "/api/settings/notification-history") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("entries");
    expect(Array.isArray(body.entries)).toBe(true);
  });
});

// ─── GET /api/settings/notification-history — 500 error path ─────────────────

describe("GET /api/settings/notification-history — 500 error path", () => {
  it("returns 500 when db query throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await notifHistoryGET(req("GET", "/api/settings/notification-history") as never);
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── GET /api/settings/login-notification — 500 error path ───────────────────

describe("GET /api/settings/login-notification — 500 error path", () => {
  it("returns 500 when db query throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await loginNotifGET(req("GET", "/api/settings/login-notification"));
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── PATCH /api/settings/login-notification — 500 error path ─────────────────

describe("PATCH /api/settings/login-notification — 500 error path", () => {
  it("returns 500 when db update throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "update").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await loginNotifPATCH(
      req("PATCH", "/api/settings/login-notification", { enabled: true })
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── GET/POST/DELETE /api/settings/calendar-feed ─────────────────────────────

describe("GET /api/settings/calendar-feed", () => {
  it("returns 401 when unauthenticated", async () => {
    asVerifiedUserFailed("UNAUTHORIZED");
    const res = await calendarGET(req("GET", "/api/settings/calendar-feed"));
    expect(res.status).toBe(401);
  });

  it("returns calendar feed status for verified user", async () => {
    const user = await createTestUser();
    asVerifiedUser(user.id);
    const res = await calendarGET(req("GET", "/api/settings/calendar-feed"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("active");
  });
});

describe("POST /api/settings/calendar-feed", () => {
  it("returns 401 when unauthenticated", async () => {
    asVerifiedUserFailed("UNAUTHORIZED");
    const res = await calendarPOST(req("POST", "/api/settings/calendar-feed"));
    expect(res.status).toBe(401);
  });

  it("returns url and createdAt for verified user", async () => {
    const user = await createTestUser();
    asVerifiedUser(user.id);
    const res = await calendarPOST(req("POST", "/api/settings/calendar-feed"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("url");
    expect(body).toHaveProperty("createdAt");
    expect(typeof body.url).toBe("string");
    expect(body.url).toContain(".ics");
  });

  it("refuses a Bearer/API-key caller with 403 BEARER_SESSION_REQUIRED, even one the legacy verified-auth check would have allowed through", async () => {
    const user = await createTestUser();
    // Simulates the old behavior: resolveVerifiedApiUser exempts Bearer
    // callers from the 2FA gate and would say "fine" (this endpoint no
    // longer consults it for POST). resolveSessionOnlyApiUser is the one
    // POST must now use, and it refuses outright.
    mockVerifiedAuth.mockResolvedValue({
      ok: true,
      user: { userId: user.id, readonly: false },
    });
    mockSessionOnlyAuth.mockResolvedValue({
      ok: false,
      reason: "BEARER_SESSION_REQUIRED",
    });
    const res = await calendarPOST(req("POST", "/api/settings/calendar-feed"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("BEARER_SESSION_REQUIRED");
  });
});

describe("DELETE /api/settings/calendar-feed", () => {
  it("returns 401 when unauthenticated", async () => {
    asVerifiedUserFailed("UNAUTHORIZED");
    const res = await calendarDELETE(req("DELETE", "/api/settings/calendar-feed"));
    expect(res.status).toBe(401);
  });

  it("returns success when revoking feed token", async () => {
    const user = await createTestUser();
    asVerifiedUser(user.id);
    // First create a token
    await calendarPOST(req("POST", "/api/settings/calendar-feed"));
    // Then revoke it
    const res = await calendarDELETE(req("DELETE", "/api/settings/calendar-feed"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("refuses a Bearer/API-key caller with 403 BEARER_SESSION_REQUIRED, even one the legacy verified-auth check would have allowed through", async () => {
    const user = await createTestUser();
    mockVerifiedAuth.mockResolvedValue({
      ok: true,
      user: { userId: user.id, readonly: false },
    });
    mockSessionOnlyAuth.mockResolvedValue({
      ok: false,
      reason: "BEARER_SESSION_REQUIRED",
    });
    const res = await calendarDELETE(req("DELETE", "/api/settings/calendar-feed"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("BEARER_SESSION_REQUIRED");
  });
});

// ─── GET/PUT /api/settings/notification-channels ─────────────────────────────

describe("GET /api/settings/notification-channels", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await channelsGET(req("GET", "/api/settings/notification-channels") as never);
    expect(res.status).toBe(401);
  });

  it("returns empty channels list for new user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await channelsGET(req("GET", "/api/settings/notification-channels") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("channels");
    expect(Array.isArray(body.channels)).toBe(true);
  });
});

describe("PUT /api/settings/notification-channels", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        type: "ntfy",
        config: { url: "https://ntfy.sh/test", topic: "test" },
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        type: "ntfy",
        config: { url: "https://ntfy.sh/test", topic: "test" },
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 for invalid channel type", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        type: "invalid_type",
        config: {},
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 when upserting ntfy channel", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        type: "ntfy",
        config: { url: "https://ntfy.sh/test", topic: "mytest" },
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns channels list with newly added ntfy channel", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Upsert channel
    await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        type: "ntfy",
        config: { url: "https://ntfy.sh/mymomo", topic: "mymomo" },
        enabled: true,
      }) as never
    );
    // Get channels
    const res = await channelsGET(req("GET", "/api/settings/notification-channels") as never);
    const body = await res.json();
    const ntfyChannel = body.channels.find((c: { type: string }) => c.type === "ntfy");
    expect(ntfyChannel).toBeDefined();
    expect(ntfyChannel.enabled).toBe(true);
  });
});

// ─── DELETE /api/settings/notification-channels/:type ────────────────────────

describe("DELETE /api/settings/notification-channels/:type", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await channelTypeDELETE(
      req("DELETE", "/api/settings/notification-channels/ntfy") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await channelTypeDELETE(
      req("DELETE", "/api/settings/notification-channels/ntfy") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when channel does not exist", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await channelTypeDELETE(
      req("DELETE", "/api/settings/notification-channels/ntfy") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 after deleting existing channel", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // First create the channel
    await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        type: "ntfy",
        config: { url: "https://ntfy.sh/deleteme", topic: "deleteme" },
        enabled: true,
      }) as never
    );
    // Then delete it
    const res = await channelTypeDELETE(
      req("DELETE", "/api/settings/notification-channels/ntfy") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── POST /api/settings/notification-channels/:type/test ─────────────────────

describe("POST /api/settings/notification-channels/:type/test", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await channelTypeTestPOST(
      req("POST", "/api/settings/notification-channels/ntfy/test") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await channelTypeTestPOST(
      req("POST", "/api/settings/notification-channels/ntfy/test") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 when test notification is sent successfully", async () => {
    const { sendTestNotification } = await import("@/lib/notifications");
    vi.mocked(sendTestNotification).mockResolvedValueOnce(true);

    const user = await createTestUser();
    asUser(user.id);
    const res = await channelTypeTestPOST(
      req("POST", "/api/settings/notification-channels/ntfy/test") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when test notification fails", async () => {
    const { sendTestNotification } = await import("@/lib/notifications");
    vi.mocked(sendTestNotification).mockResolvedValueOnce(false);

    const user = await createTestUser();
    asUser(user.id);
    const res = await channelTypeTestPOST(
      req("POST", "/api/settings/notification-channels/ntfy/test") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 when sendTestNotification throws an unexpected error", async () => {
    const { sendTestNotification } = await import("@/lib/notifications");
    vi.mocked(sendTestNotification).mockRejectedValueOnce(new Error("Send failed"));

    const user = await createTestUser();
    asUser(user.id);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await channelTypeTestPOST(
      req("POST", "/api/settings/notification-channels/ntfy/test") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

// ─── GET/POST /api/settings/webhooks ─────────────────────────────────────────

describe("GET /api/settings/webhooks", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await webhooksGET(req("GET", "/api/settings/webhooks") as never);
    expect(res.status).toBe(401);
  });

  it("returns empty endpoints list for new user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await webhooksGET(req("GET", "/api/settings/webhooks") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("endpoints");
    expect(Array.isArray(body.endpoints)).toBe(true);
  });
});

describe("POST /api/settings/webhooks", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Test Webhook",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Test Webhook",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(rateLimitLib, "checkRateLimit").mockReturnValueOnce({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Test Webhook",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(429);
    spy.mockRestore();
  });

  it("returns 422 for missing name", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 for non-HTTPS URL", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Test Webhook",
        url: "http://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(422);
  });

  it("creates webhook and returns 201 with endpoint data", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Test Webhook",
        url: "https://example.com/hook",
        events: ["task.created"],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("endpoint");
    expect(body.endpoint.name).toBe("Test Webhook");
  });
});

// ─── GET/PATCH/DELETE /api/settings/webhooks/:id ─────────────────────────────

describe("GET /api/settings/webhooks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdGET(
      req("GET", `/api/settings/webhooks/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent webhook", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdGET(
      req("GET", `/api/settings/webhooks/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns delivery history for own webhook", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Create a webhook first
    const createRes = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "My Webhook",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    const { endpoint } = await createRes.json();
    // Fetch deliveries
    const res = await webhookByIdGET(
      req("GET", `/api/settings/webhooks/${endpoint.id}`) as never,
      { params: Promise.resolve({ id: endpoint.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("deliveries");
  });
});

describe("PATCH /api/settings/webhooks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdPATCH(
      req("PATCH", `/api/settings/webhooks/${fakeId}`, { name: "Updated" }) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdPATCH(
      req("PATCH", `/api/settings/webhooks/${fakeId}`, { name: "Updated" }) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent webhook", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdPATCH(
      req("PATCH", `/api/settings/webhooks/${fakeId}`, { name: "Updated" }) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(404);
  });

  it("updates webhook name and returns 200", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Create a webhook
    const createRes = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Original",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    const { endpoint } = await createRes.json();
    // Update it
    const res = await webhookByIdPATCH(
      req("PATCH", `/api/settings/webhooks/${endpoint.id}`, { name: "Updated Name" }) as never,
      { params: Promise.resolve({ id: endpoint.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.endpoint.name).toBe("Updated Name");
  });
});

describe("DELETE /api/settings/webhooks/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdDELETE(
      req("DELETE", `/api/settings/webhooks/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdDELETE(
      req("DELETE", `/api/settings/webhooks/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent webhook", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await webhookByIdDELETE(
      req("DELETE", `/api/settings/webhooks/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(404);
  });

  it("deletes webhook and returns 200", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Create a webhook
    const createRes = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "To Delete",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    const { endpoint } = await createRes.json();
    // Delete it
    const res = await webhookByIdDELETE(
      req("DELETE", `/api/settings/webhooks/${endpoint.id}`) as never,
      { params: Promise.resolve({ id: endpoint.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── Error paths: vacation-mode ───────────────────────────────────────────────

describe("GET /api/settings/vacation-mode — error path", () => {
  it("returns 500 when getVacationStatus throws", async () => {
    const user = await createTestUser();
    asUser(user.id);
    vi.mocked(getVacationStatus).mockRejectedValueOnce(new Error("DB error"));
    const res = await vacationGET(req("GET", "/api/settings/vacation-mode"));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/settings/vacation-mode — error paths", () => {
  it("returns 400 for malformed JSON body", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const badReq = new Request("http://localhost/api/settings/vacation-mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await vacationPATCH(badReq);
    expect(res.status).toBe(400);
  });

  it("returns 500 when deactivateVacationMode throws", async () => {
    const user = await createTestUser();
    asUser(user.id);
    vi.mocked(deactivateVacationMode).mockRejectedValueOnce(new Error("DB error"));
    const res = await vacationPATCH(
      req("PATCH", "/api/settings/vacation-mode", { active: false })
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 when activateVacationMode throws", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const endDate = futureDate.toISOString().slice(0, 10);
    vi.mocked(activateVacationMode).mockRejectedValueOnce(new Error("DB error"));
    const res = await vacationPATCH(
      req("PATCH", "/api/settings/vacation-mode", { active: true, endDate })
    );
    expect(res.status).toBe(500);
  });
});

// ─── Error paths: quest settings ─────────────────────────────────────────────

describe("PATCH /api/settings/quest — error path", () => {
  it("returns 400 for malformed JSON body", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const badReq = new Request("http://localhost/api/settings/quest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await questPATCH(badReq as never);
    expect(res.status).toBe(400);
  });
});

// ─── Error paths: timezone settings ──────────────────────────────────────────

describe("PATCH /api/settings/timezone — error path", () => {
  it("returns 400 for malformed JSON body", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const badReq = new Request("http://localhost/api/settings/timezone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await timezonePATCH(badReq);
    expect(res.status).toBe(400);
  });
});

// ─── Error paths: notification-channels ──────────────────────────────────────

describe("PUT /api/settings/notification-channels — additional paths", () => {
  it("returns 400 for malformed JSON body", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const badReq = new Request("http://localhost/api/settings/notification-channels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await channelsPUT(badReq as never);
    expect(res.status).toBe(400);
  });

  it("updates existing channel when PUT twice for same type", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const payload = {
      type: "ntfy",
      config: { url: "https://ntfy.sh/update-test", topic: "update-test" },
      enabled: true,
    };
    // First PUT — inserts
    await channelsPUT(req("PUT", "/api/settings/notification-channels", payload) as never);
    // Second PUT — triggers the update branch (line 86)
    const res = await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        ...payload,
        enabled: false,
      }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 when db throws during PUT", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("DB error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await channelsPUT(
      req("PUT", "/api/settings/notification-channels", {
        type: "ntfy",
        config: { url: "https://ntfy.sh/error-test", topic: "error-test" },
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── GET /api/settings/notification-channels — 500 error path ────────────────

describe("GET /api/settings/notification-channels — 500 error path", () => {
  it("returns 500 when db query throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await channelsGET(req("GET", "/api/settings/notification-channels") as never);
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── DELETE /api/settings/notification-channels/:type — 500 error path ───────

describe("DELETE /api/settings/notification-channels/:type — 500 error path", () => {
  it("returns 500 when db delete throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const spy = vi.spyOn(db, "delete").mockImplementationOnce(() => {
      throw new Error("DB connection error");
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await channelTypeDELETE(
      req("DELETE", "/api/settings/notification-channels/ntfy") as never,
      { params: Promise.resolve({ type: "ntfy" }) }
    );
    expect(res.status).toBe(500);
    spy.mockRestore();
    consoleSpy.mockRestore();
  });
});

// ─── Error paths: calendar-feed ──────────────────────────────────────────────

describe("POST /api/settings/calendar-feed — error path", () => {
  it("returns 500 when createOrRotateCalendarToken throws", async () => {
    const user = await createTestUser();
    asVerifiedUser(user.id);
    vi.mocked(createOrRotateCalendarToken).mockRejectedValueOnce(new Error("DB error"));
    const res = await calendarPOST(req("POST", "/api/settings/calendar-feed"));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/settings/calendar-feed — error path", () => {
  it("returns 500 when revokeCalendarToken throws", async () => {
    const user = await createTestUser();
    asVerifiedUser(user.id);
    vi.mocked(revokeCalendarToken).mockRejectedValueOnce(new Error("DB error"));
    const res = await calendarDELETE(req("DELETE", "/api/settings/calendar-feed"));
    expect(res.status).toBe(500);
  });
});

// ─── Error paths: webhooks ────────────────────────────────────────────────────

describe("GET /api/settings/webhooks — error path", () => {
  it("returns 500 when listWebhookEndpoints throws", async () => {
    const user = await createTestUser();
    asUser(user.id);
    vi.mocked(listWebhookEndpoints).mockRejectedValueOnce(new Error("DB error"));
    const res = await webhooksGET(req("GET", "/api/settings/webhooks") as never);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/settings/webhooks — error paths", () => {
  it("returns 400 for malformed JSON body", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const badReq = new Request("http://localhost/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json }",
    });
    const res = await webhooksPOST(badReq as never);
    expect(res.status).toBe(400);
  });

  it("returns 409 when webhook limit is exceeded", async () => {
    const user = await createTestUser();
    asUser(user.id);
    vi.mocked(createWebhookEndpoint).mockRejectedValueOnce(new Error("limit_exceeded"));
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Over Limit",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(409);
    const body = await res.json() as { code: string };
    expect(body.code).toBe("limit_exceeded");
  });

  it("returns 500 when createWebhookEndpoint throws an unexpected error", async () => {
    const user = await createTestUser();
    asUser(user.id);
    vi.mocked(createWebhookEndpoint).mockRejectedValueOnce(new Error("unexpected"));
    const res = await webhooksPOST(
      req("POST", "/api/settings/webhooks", {
        name: "Error Hook",
        url: "https://example.com/hook",
        events: [],
        enabled: true,
      }) as never
    );
    expect(res.status).toBe(500);
  });
});
