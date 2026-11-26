/**
 * Client-side Web Push subscription, shared by the notification settings and
 * the onboarding wizard so both send exactly what POST /api/push/subscribe
 * validates: `{ subscription: { endpoint, keys }, notificationTime?, timezone }`.
 *
 * Onboarding used to post its own body without `subscription`: every request
 * was a 422, and the step still reported push as enabled.
 *
 * Permission handling stays with the caller (each shows its own "denied" state).
 */

/** Messages the caller wants thrown for the two failures it localizes. */
export interface PushSubscribeMessages {
  /** No service worker became ready within 5 s (e.g. the dev server, where next-pwa is off) */
  noServiceWorker: string;
  /** The server refused the subscription and gave no error text */
  saveFailed: string;
}

/**
 * Throws if `key` is not an uncompressed P-256 public key (65 bytes, 0x04 prefix).
 * A private key (32 bytes) in NEXT_PUBLIC_VAPID_PUBLIC_KEY is the usual mistake.
 *
 * @param key - base64url VAPID public key, already trimmed
 */
export function assertVapidPublicKey(key: string): void {
  let decoded: string;
  try {
    const padding = "=".repeat((4 - (key.length % 4)) % 4);
    decoded = atob(key.replace(/-/g, "+").replace(/_/g, "/") + padding);
  } catch (err) {
    throw new Error(`VAPID public key could not be decoded: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (decoded.length !== 65) {
    throw new Error(`VAPID public key invalid: ${decoded.length} bytes (expected 65). Check NEXT_PUBLIC_VAPID_PUBLIC_KEY — private key has only 32 bytes.`);
  }
  if (decoded.charCodeAt(0) !== 0x04) {
    throw new Error(`VAPID public key invalid: first byte 0x${decoded.charCodeAt(0).toString(16)} (expected 0x04 for uncompressed EC point).`);
  }
}

/**
 * Subscribes this browser to Web Push and stores the subscription on the server.
 * Call only after Notification permission is "granted".
 *
 * @param vapidPublicKey - NEXT_PUBLIC_VAPID_PUBLIC_KEY as passed from the server
 * @param messages - localized texts for the two caller-facing failures
 * @param notificationTime - preferred daily reminder time (HH:MM), optional
 * @throws Error on a missing service worker, an invalid key, a push service error or a refused save
 */
export async function subscribeToPush(
  vapidPublicKey: string,
  messages: PushSubscribeMessages,
  notificationTime?: string,
): Promise<void> {
  const swTimeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(messages.noServiceWorker)), 5000),
  );
  const registration = await Promise.race([navigator.serviceWorker.ready, swTimeout]);

  // Trim whitespace/newlines that env var storage can introduce
  const vapidKey = vapidPublicKey.trim();
  assertVapidPublicKey(vapidKey);

  // A leftover subscription (e.g. from a previous SW registration) can make
  // Chrome throw "AbortError: Registration failed - push service error".
  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  // base64url string directly (Chrome 67+); avoids Uint8Array conversion issues
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKey,
  });

  const { endpoint, keys } = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: { endpoint, keys },
      notificationTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? messages.saveFailed);
  }
}
