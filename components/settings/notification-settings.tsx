"use client";

/**
 * NotificationSettings component.
 *
 * Handles the full push notification permission flow:
 *  1. Check browser support (Notification API + Service Worker + PushManager)
 *  2. Request Notification.requestPermission() on user click
 *  3. Subscribe to push via navigator.serviceWorker.ready + pushManager.subscribe()
 *  4. POST subscription + preferred time to /api/push/subscribe
 *  5. Show current status and allow toggling off (DELETE /api/push/subscribe)
 *
 * Gracefully degrades when:
 *  - The Notification API is unavailable (older browsers, SSR)
 *  - VAPID public key is not configured
 *  - Service worker is not registered (development mode)
 */

import { useState, useEffect } from "react";
import { clientEnv } from "@/lib/env";

type NotificationStatus =
  | "unsupported"       // Browser doesn't support Notifications
  | "no-vapid"          // VAPID public key not configured
  | "default"           // Permission not yet requested
  | "denied"            // User denied permission
  | "loading"           // Requesting permission or subscribing
  | "active"            // Subscribed and enabled
  | "inactive";         // Previously subscribed but now disabled

interface NotificationSettingsProps {
  /** Whether the user currently has notifications enabled (from DB) */
  initialEnabled: boolean;
  /** Current notification time from DB (HH:MM) */
  initialTime: string;
}

/**
 * Notification settings section for the settings page.
 * Manages push notification permission, subscription, and preferred time.
 *
 * @param initialEnabled - Whether notifications are currently enabled for this user
 * @param initialTime - Current notification time preference in HH:MM format
 */
export function NotificationSettings({
  initialEnabled,
  initialTime,
}: NotificationSettingsProps) {
  const [status, setStatus] = useState<NotificationStatus>("loading");
  const [notificationTime, setNotificationTime] = useState(
    initialTime || "08:00"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /** Check browser support and current permission state on mount */
  useEffect(() => {
    if (typeof window === "undefined") {
      setStatus("unsupported");
      return;
    }

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    if (!clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setStatus("no-vapid");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    if (initialEnabled && Notification.permission === "granted") {
      setStatus("active");
      return;
    }

    setStatus("default");
  }, [initialEnabled]);

  /**
   * Converts a URL-safe base64 string to a Uint8Array.
   * Required for the applicationServerKey when subscribing to push.
   */
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Requests notification permission, subscribes to push,
   * and saves the subscription to the server.
   */
  async function handleEnable() {
    setIsSaving(true);
    setMessage(null);

    try {
      // Step 1: Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        setMessage(
          "Notification permission denied. Please enable it in your browser settings."
        );
        setIsSaving(false);
        return;
      }

      // Step 2: Wait for the service worker to be ready (with timeout)
      // In development, next-pwa disables the SW — detect this early.
      const swTimeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Service worker not available. Push notifications require a production build (run npm run build && npm start).")),
          5000
        )
      );
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        swTimeout,
      ]);

      // Step 3: Subscribe to push
      const vapidKey = clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setMessage("Push notifications are not configured on this server.");
        setIsSaving(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      });

      // Step 4: Serialize and send to server
      const subscriptionJSON = subscription.toJSON();

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: subscriptionJSON.endpoint,
            keys: subscriptionJSON.keys,
          },
          notificationTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to save subscription");
      }

      setStatus("active");
      setMessage("Notifications enabled successfully.");
    } catch (err) {
      console.error("[NotificationSettings] Enable failed:", err);
      setMessage(
        err instanceof Error ? err.message : "Failed to enable notifications."
      );
      setStatus("default");
    } finally {
      setIsSaving(false);
    }
  }

  /** Disables notifications and removes the push subscription from the server. */
  async function handleDisable() {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/push/subscribe", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to remove subscription");
      }

      setStatus("default");
      setMessage("Notifications disabled.");
    } catch (err) {
      console.error("[NotificationSettings] Disable failed:", err);
      setMessage(
        err instanceof Error ? err.message : "Failed to disable notifications."
      );
    } finally {
      setIsSaving(false);
    }
  }

  /** Saves the notification time preference when the user changes it */
  async function handleTimeChange(newTime: string) {
    setNotificationTime(newTime);

    if (status !== "active") return;

    try {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Re-use existing subscription stored on server — just update time
          // The server PATCH isn't available, so we skip re-subscribing here;
          // time is saved next time the user re-enables. For active users we
          // send a PATCH to a dedicated settings endpoint (not yet built),
          // so for now just note: the time change requires re-subscribe.
          notificationTime: newTime,
        }),
      });
    } catch {
      // Non-critical: time will be saved on next subscribe
    }
  }

  /** Sends a test push notification */
  async function handleTest() {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json() as { success?: boolean; error?: string };

      if (data.success) {
        setMessage("Test notification sent! Check your device.");
      } else {
        setMessage(data.error ?? "Failed to send test notification.");
      }
    } catch {
      setMessage("Failed to send test notification.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (status === "unsupported") {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
        >
          Push notifications are not supported by your browser.
        </p>
      </div>
    );
  }

  if (status === "no-vapid") {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
        >
          Push notifications are not configured on this server. Set
          NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                status === "active"
                  ? "var(--accent-green)"
                  : status === "denied"
                  ? "var(--accent-red)"
                  : "var(--text-muted)",
            }}
            aria-hidden="true"
          />
          <span
            style={{
              color:
                status === "active"
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
            }}
          >
            {status === "active"
              ? "Notifications active"
              : status === "denied"
              ? "Permission denied"
              : "Notifications not enabled"}
          </span>
        </span>
      </div>

      {/* Notification time picker — shown when active */}
      {status === "active" && (
        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm font-medium"
            htmlFor="notification-time"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            Remind me daily at
          </label>
          <input
            id="notification-time"
            type="time"
            value={notificationTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-36 rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {status === "active" ? (
          <>
            <button
              onClick={handleTest}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
              }}
            >
              Send test
            </button>
            <button
              onClick={handleDisable}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
              style={{
                backgroundColor: "transparent",
                border: "1px solid var(--accent-red)",
                color: "var(--accent-red)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {isSaving ? "Disabling..." : "Disable notifications"}
            </button>
          </>
        ) : status === "denied" ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            Notifications are blocked. Open your browser&apos;s site settings to
            allow them.
          </p>
        ) : (
          <button
            onClick={handleEnable}
            disabled={isSaving || status === "loading"}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent-amber)",
              color: "#0f1410",
              fontFamily: "var(--font-ui)",
            }}
          >
            {isSaving ? "Enabling..." : "Enable notifications"}
          </button>
        )}
      </div>

      {/* Feedback message */}
      {message && (
        <p
          className="text-sm"
          style={{
            color:
              message.toLowerCase().includes("success") ||
              message.toLowerCase().includes("sent")
                ? "var(--accent-green)"
                : "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
