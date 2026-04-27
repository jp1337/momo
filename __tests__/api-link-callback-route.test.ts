/**
 * Integration tests for GET /api/auth/link-callback
 *
 * Covers: missing token (redirect), expired token (redirect), no session after
 * OAuth (redirect), same-user re-link (redirect), current user has data (redirect),
 * DB merge failure (redirect), and success merge (redirect).
 *
 * next/navigation's redirect() is mocked to throw a sentinel error instead of
 * triggering Next.js server-side redirect, so tests can assert on the URL.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

// redirect() in Next.js throws a NEXT_REDIRECT error. We replicate that
// behaviour here so route code that calls redirect() terminates as expected
// and tests can assert on the redirect destination.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, linkingRequests } from "@/lib/db/schema";
import { GET } from "@/app/api/auth/link-callback/route";
import { createTestUser, createTestTask } from "./helpers/fixtures";

const mockAuth = vi.mocked(auth);

function makeRequest(token?: string): Request {
  const url = token
    ? `http://localhost/api/auth/link-callback?token=${token}`
    : "http://localhost/api/auth/link-callback";
  return new Request(url, { method: "GET" });
}

async function createLinkRequest(userId: string, provider = "github"): Promise<string> {
  const [row] = await db
    .insert(linkingRequests)
    .values({
      userId,
      provider,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })
    .returning({ id: linkingRequests.id });
  return row.id;
}

function extractRedirectUrl(err: unknown): string {
  if (err instanceof Error && err.message.startsWith("REDIRECT:")) {
    return err.message.slice("REDIRECT:".length);
  }
  throw err;
}

describe("GET /api/auth/link-callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(null as never);
  });

  it("redirects to missing_token when no token query param is provided", async () => {
    await expect(GET(makeRequest())).rejects.toSatisfy((err: unknown) =>
      extractRedirectUrl(err) === "/settings?link-error=missing_token"
    );
  });

  it("redirects to expired when the token does not exist in the DB", async () => {
    await expect(GET(makeRequest("00000000-0000-0000-0000-000000000099"))).rejects.toSatisfy(
      (err: unknown) => extractRedirectUrl(err) === "/settings?link-error=expired"
    );
  });

  it("redirects to expired when the linking request is past its expiresAt", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    // Insert an already-expired linking request
    const [row] = await db
      .insert(linkingRequests)
      .values({
        userId: user.id,
        provider: "github",
        expiresAt: new Date(Date.now() - 60_000), // 1 minute in the past
      })
      .returning({ id: linkingRequests.id });

    await expect(GET(makeRequest(row.id))).rejects.toSatisfy(
      (err: unknown) => extractRedirectUrl(err) === "/settings?link-error=expired"
    );
  });

  it("redirects to no_session when auth() returns null after OAuth", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const token = await createLinkRequest(user.id);
    mockAuth.mockResolvedValue(null as never);

    await expect(GET(makeRequest(token))).rejects.toSatisfy(
      (err: unknown) => extractRedirectUrl(err) === "/settings?link-error=no_session"
    );
  });

  it("redirects to linked=github when the same user re-links the same provider", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const token = await createLinkRequest(user.id, "github");
    // Auth returns the same user as the linking request → no merge needed
    mockAuth.mockResolvedValue({ user: { id: user.id } } as never);

    await expect(GET(makeRequest(token))).rejects.toSatisfy(
      (err: unknown) => extractRedirectUrl(err) === "/settings?linked=github"
    );
  });

  it("redirects to already_used when the current user already has tasks", async () => {
    const originalUser = await createTestUser({ timezone: "Europe/Berlin" });
    const currentUser = await createTestUser({ timezone: "Europe/Berlin" });
    // Give the currentUser some data (a task)
    await createTestTask(currentUser.id, { type: "ONE_TIME" });

    const token = await createLinkRequest(originalUser.id, "github");
    mockAuth.mockResolvedValue({ user: { id: currentUser.id } } as never);

    await expect(GET(makeRequest(token))).rejects.toSatisfy(
      (err: unknown) => extractRedirectUrl(err) === "/settings?link-error=already_used"
    );
  });

  it("redirects to merge_failed when the DB update to move accounts throws", async () => {
    const originalUser = await createTestUser({ timezone: "Europe/Berlin" });
    const currentUser = await createTestUser({ timezone: "Europe/Berlin" });
    const token = await createLinkRequest(originalUser.id, "github");
    mockAuth.mockResolvedValue({ user: { id: currentUser.id } } as never);

    // Make db.update throw so the merge catch block fires
    const updateSpy = vi
      .spyOn(db, "update")
      .mockRejectedValueOnce(new Error("DB update failed") as never);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(GET(makeRequest(token))).rejects.toSatisfy(
      (err: unknown) => extractRedirectUrl(err) === "/settings?link-error=merge_failed"
    );

    updateSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("redirects to linked=github on a successful account merge", async () => {
    const originalUser = await createTestUser({ timezone: "Europe/Berlin" });
    const currentUser = await createTestUser({ timezone: "Europe/Berlin" });

    // Insert a github account for currentUser (this is what gets moved)
    await db.insert(accounts).values({
      userId: currentUser.id,
      type: "oauth",
      provider: "github",
      providerAccountId: "gh-merge-test-999",
    });

    const token = await createLinkRequest(originalUser.id, "github");
    mockAuth.mockResolvedValue({ user: { id: currentUser.id } } as never);

    await expect(GET(makeRequest(token))).rejects.toSatisfy(
      (err: unknown) => extractRedirectUrl(err) === "/settings?linked=github"
    );
  });
});
