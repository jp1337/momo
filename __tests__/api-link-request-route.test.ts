/**
 * Integration tests for POST /api/auth/link-request
 *
 * Covers: unauthenticated (401), bad JSON (400), invalid provider (422),
 * provider not configured (400), provider already linked (409), success (200).
 *
 * auth() is mocked; the DB (accounts, linkingRequests) is real.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { POST } from "@/app/api/auth/link-request/route";
import { createTestUser } from "./helpers/fixtures";

const mockAuth = vi.mocked(auth);

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/link-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function asSession(userId: string, email = "test@example.com"): void {
  mockAuth.mockResolvedValue({ user: { id: userId, email } } as never);
}

describe("POST /api/auth/link-request", () => {
  let savedGithubClientId: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
    savedGithubClientId = process.env.GITHUB_CLIENT_ID;
  });

  afterEach(() => {
    if (savedGithubClientId === undefined) {
      delete process.env.GITHUB_CLIENT_ID;
    } else {
      process.env.GITHUB_CLIENT_ID = savedGithubClientId;
    }
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await POST(jsonRequest({ provider: "github" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);
    const req = new Request("http://localhost/api/auth/link-request", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 422 for an unsupported provider value", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);
    const res = await POST(jsonRequest({ provider: "twitter" }));
    expect(res.status).toBe(422);
  });

  it("returns 400 when provider is valid but not configured (no env var)", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);
    // Ensure GITHUB_CLIENT_ID is unset so the provider appears unconfigured
    delete process.env.GITHUB_CLIENT_ID;
    const res = await POST(jsonRequest({ provider: "github" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Provider not configured");
  });

  it("returns 409 when provider is already linked to the account", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);
    process.env.GITHUB_CLIENT_ID = "fake-client-id";

    // Insert an existing accounts row for this user + provider
    await db.insert(accounts).values({
      userId: user.id,
      type: "oauth",
      provider: "github",
      providerAccountId: "gh-12345",
    });

    const res = await POST(jsonRequest({ provider: "github" }));
    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Provider already linked to your account");
  });

  it("returns 200 with a token when linking request is created", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    asSession(user.id);
    process.env.GITHUB_CLIENT_ID = "fake-client-id";

    const res = await POST(jsonRequest({ provider: "github" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { token: string };
    expect(typeof body.token).toBe("string");
    expect(body.token.length).toBeGreaterThan(0);
  });
});
