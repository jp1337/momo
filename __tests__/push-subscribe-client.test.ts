/**
 * lib/client/push-subscribe.ts against the real POST /api/push/subscribe.
 *
 * The onboarding step once built its own body without `subscription` and got
 * a 422 on every request while telling the user push was on. This test sends
 * whatever the shared client helper produces through the real route handler,
 * so the two cannot drift apart again.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateVAPIDKeys } from "web-push";

vi.mock("@/lib/api-auth", async () => ({
  resolveApiUser: vi.fn(),
  readonlyKeyResponse: () => Response.json({ error: "Forbidden" }, { status: 403 }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

import { resolveApiUser, type ApiUser } from "@/lib/api-auth";
import { POST as subscribePOST } from "@/app/api/push/subscribe/route";
import { assertVapidPublicKey, subscribeToPush } from "@/lib/client/push-subscribe";
import { createTestUser } from "./helpers/fixtures";

const MESSAGES = { noServiceWorker: "no sw", saveFailed: "save failed" };

/** Stubs navigator.serviceWorker with a push manager that hands out one subscription. */
function stubServiceWorker(): void {
  const subscription = {
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/push/client-helper-test",
      keys: { p256dh: "dGVzdA==", auth: "dGVzdA==" },
    }),
  };
  vi.stubGlobal("navigator", {
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: async () => null,
          subscribe: async () => subscription,
        },
      }),
    },
  });
}

describe("subscribeToPush", () => {
  beforeEach(() => stubServiceWorker());
  afterEach(() => vi.unstubAllGlobals());

  it("sends a body the subscribe route accepts", async () => {
    const user = await createTestUser();
    vi.mocked(resolveApiUser).mockResolvedValue({ userId: user.id, readonly: false } as ApiUser);
    // Route the helper's fetch into the real handler instead of the network
    vi.stubGlobal("fetch", (url: string, init: RequestInit) =>
      subscribePOST(new Request(`http://localhost${url}`, init) as never),
    );

    await expect(
      subscribeToPush(generateVAPIDKeys().publicKey, MESSAGES, "09:00"),
    ).resolves.toBeUndefined();
  });

  it("throws the server's error when the save is refused", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "nope" }, { status: 422 }));
    await expect(subscribeToPush(generateVAPIDKeys().publicKey, MESSAGES)).rejects.toThrow("nope");
  });
});

describe("assertVapidPublicKey", () => {
  it("accepts a generated public key", () => {
    expect(() => assertVapidPublicKey(generateVAPIDKeys().publicKey)).not.toThrow();
  });

  it("rejects a private key, the usual misconfiguration", () => {
    expect(() => assertVapidPublicKey(generateVAPIDKeys().privateKey)).toThrow(/32 bytes/);
  });
});
