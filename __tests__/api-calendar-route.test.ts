/**
 * Integration tests for GET /api/calendar/:token
 *
 * The calendar feed is public — no session, no Bearer header. The token in
 * the URL path is the sole authentication. These tests exercise the route
 * handler directly with real DB-backed calendar tokens.
 */

import { vi, describe, it, expect } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("@/lib/calendar", async (orig) => {
  const actual = await orig<typeof import("@/lib/calendar")>();
  return {
    ...actual,
    buildIcsForUser: vi.fn(actual.buildIcsForUser),
  };
});

import { GET } from "@/app/api/calendar/[token]/route";
import {
  createOrRotateCalendarToken,
  revokeCalendarToken,
  buildIcsForUser,
} from "@/lib/calendar";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import { getLocalDateString } from "@/lib/date-utils";

const TZ = "Europe/Berlin";

/** Build the (request, params) tuple expected by the route handler. */
function calendarReq(
  token: string
): [Request, { params: Promise<{ token: string }> }] {
  return [
    new Request(`http://localhost/api/calendar/${token}`),
    { params: Promise.resolve({ token }) },
  ];
}

// ─── Unknown / invalid tokens ─────────────────────────────────────────────────

describe("GET /api/calendar/:token — invalid tokens", () => {
  it("returns 404 for a completely unknown token", async () => {
    const [req, ctx] = calendarReq("invalid-token");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a revoked token", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);
    await revokeCalendarToken(user.id);

    const [req, ctx] = calendarReq(token);
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a token that looks like momo_cal_ but is wrong", async () => {
    const [req, ctx] = calendarReq("momo_cal_nottherighttoken12345");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });
});

// ─── Valid token ──────────────────────────────────────────────────────────────

describe("GET /api/calendar/:token — valid token", () => {
  it("returns 200 with Content-Type text/calendar for a valid token", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);

    const [req, ctx] = calendarReq(token);
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    const ct = res.headers.get("content-type") ?? "";
    expect(ct).toContain("text/calendar");
  });

  it("response body contains BEGIN:VCALENDAR and END:VCALENDAR", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);

    const [req, ctx] = calendarReq(token);
    const res = await GET(req, ctx);

    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("END:VCALENDAR");
  });

  it("strips .ics suffix from the token path", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);

    const [req, ctx] = calendarReq(token + ".ics");
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
  });

  it("includes a VEVENT for a task with a dueDate", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);
    const today = getLocalDateString(TZ);

    await createTestTask(user.id, {
      title: "Calendar Route Task",
      type: "ONE_TIME",
      dueDate: today,
    });

    const [req, ctx] = calendarReq(token);
    const res = await GET(req, ctx);
    const body = await res.text();

    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("Calendar Route Task");
  });

  it("does not include completed tasks in the feed", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);
    const today = getLocalDateString(TZ);

    await createTestTask(user.id, {
      title: "Done Already Route Task",
      type: "ONE_TIME",
      dueDate: today,
      completedAt: new Date(),
    });

    const [req, ctx] = calendarReq(token);
    const res = await GET(req, ctx);
    const body = await res.text();

    expect(body).not.toContain("Done Already Route Task");
  });

  it("returns Cache-Control: private, max-age=900 header", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);

    const [req, ctx] = calendarReq(token);
    const res = await GET(req, ctx);

    expect(res.headers.get("cache-control")).toContain("private");
    expect(res.headers.get("cache-control")).toContain("max-age=900");
  });

  it("old token returns 404 after rotation", async () => {
    const user = await createTestUser({ timezone: TZ });
    const oldToken = await createOrRotateCalendarToken(user.id);
    // Rotate — old token is invalidated
    await createOrRotateCalendarToken(user.id);

    const [req, ctx] = calendarReq(oldToken);
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 500 when buildIcsForUser throws an unexpected error", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);
    vi.mocked(buildIcsForUser).mockRejectedValueOnce(new Error("ICS build failed"));

    const [req, ctx] = calendarReq(token);
    const res = await GET(req, ctx);
    expect(res.status).toBe(500);
  });
});
