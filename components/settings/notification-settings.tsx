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

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

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
  /** Whether the "Due today" reminder is currently enabled (from DB) */
  initialDueTodayEnabled: boolean;
  /** Whether the recurring-due individual reminder is currently enabled (from DB) */
  initialRecurringDueEnabled: boolean;
  /** Whether the overdue reminder is currently enabled (from DB) */
  initialOverdueEnabled: boolean;
  /**
   * Whether the user has at least one enabled notification channel
   * (ntfy/pushover/telegram/email). Used to decide whether to show the
   * "Due today" toggle even when web push is not active — channel-only
   * users still need to opt in to the reminder.
   */
  hasAnyChannel: boolean;
  /**
   * The VAPID public key for push subscriptions.
   * Passed as a prop from the server component so it reflects the runtime
   * environment (NEXT_PUBLIC_* vars are build-time only in client bundles).
   */
  vapidPublicKey?: string;
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
  initialDueTodayEnabled,
  initialRecurringDueEnabled,
  initialOverdueEnabled,
  hasAnyChannel,
  vapidPublicKey,
}: NotificationSettingsProps) {
  const t = useTranslations("settings");
  const [status, setStatus] = useState<NotificationStatus>("loading");
  // Normalize to HH:MM — PostgreSQL time columns return "HH:MM:SS"
  const [notificationTime, setNotificationTime] = useState(
    (initialTime || "08:00").slice(0, 5)
  );
  const [dueTodayEnabled, setDueTodayEnabled] = useState(initialDueTodayEnabled);
  const [recurringDueEnabled, setRecurringDueEnabled] = useState(initialRecurringDueEnabled);
  const [overdueEnabled, setOverdueEnabled] = useState(initialOverdueEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const timeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    if (!vapidPublicKey) {
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
  }, [initialEnabled, vapidPublicKey]);

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
        setMessageType("error");
        setMessage(t("notif_err_denied"));
        setIsSaving(false);
        return;
      }

      // Step 2: Wait for the service worker to be ready (with timeout)
      // In development, next-pwa disables the SW — detect this early.
      const swTimeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(t("notif_err_no_sw"))),
          5000
        )
      );
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        swTimeout,
      ]);

      // Step 3: Subscribe to push
      if (!vapidPublicKey) {
        setMessageType("error");
        setMessage(t("notif_err_not_configured"));
        setIsSaving(false);
        return;
      }
      // Trim whitespace/newlines that can be introduced by env var storage
      const vapidKey = vapidPublicKey.trim();

      // Validate VAPID key format before attempting subscription.
      // A valid P-256 uncompressed public key is 65 bytes = 87–88 base64url chars.
      // Private keys are only 32 bytes (43 chars) — a common misconfiguration.
      try {
        const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
        const decoded = atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/") + padding);
        if (decoded.length !== 65) {
          throw new Error(`VAPID public key invalid: ${decoded.length} bytes (expected 65). Check NEXT_PUBLIC_VAPID_PUBLIC_KEY — private key has only 32 bytes.`);
        }
        if (decoded.charCodeAt(0) !== 0x04) {
          throw new Error(`VAPID public key invalid: first byte 0x${decoded.charCodeAt(0).toString(16)} (expected 0x04 for uncompressed EC point).`);
        }
      } catch (validationErr) {
        if (validationErr instanceof Error && validationErr.message.startsWith("VAPID")) {
          throw validationErr;
        }
        throw new Error(`VAPID public key could not be decoded: ${validationErr instanceof Error ? validationErr.message : String(validationErr)}`);
      }

      // Unsubscribe any stale existing subscription before creating a new one.
      // A leftover subscription (e.g. from a previous SW registration) can cause
      // Chrome to throw AbortError: Registration failed - push service error.
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      // Pass the VAPID public key as a base64url string directly (Chrome 67+).
      // This is the modern recommended approach and avoids Uint8Array conversion
      // issues that can cause AbortError on some Chrome versions.
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      // Step 4: Serialize and send to server
      const subscriptionJSON = subscription.toJSON();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: subscriptionJSON.endpoint,
            keys: subscriptionJSON.keys,
          },
          notificationTime,
          timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? t("notif_err_save"));
      }

      setStatus("active");
      setMessageType("success");
      setMessage(t("notif_success_enabled"));
    } catch (err) {
      // Log full details: DOMException name + message help diagnose push service errors
      console.error("[NotificationSettings] Enable failed:", err instanceof Error
        ? `${err.name}: ${err.message}`
        : err
      );
      setMessageType("error");
      setMessage(
        err instanceof Error ? `${err.name}: ${err.message}` : t("notif_err_enable")
      );
      setStatus("default");
    } finally {
      setIsSaving(false);
    }
  }

  /** Disables notifications for this device only and removes its subscription from the server. */
  async function handleDisable() {
    setIsSaving(true);
    setMessage(null);

    try {
      // Get the current device's push subscription so we only unsubscribe this device
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }

      const res = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub?.endpoint ?? "" }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? t("notif_err_disable"));
      }

      setStatus("default");
      setMessageType("success");
      setMessage(t("notif_success_disabled"));
    } catch (err) {
      console.error("[NotificationSettings] Disable failed:", err);
      setMessageType("error");
      setMessage(
        err instanceof Error ? err.message : t("notif_err_disable")
      );
    } finally {
      setIsSaving(false);
    }
  }

  /** Saves the notification time preference when the user changes it (debounced 600ms) */
  function handleTimeChange(newTime: string) {
    setNotificationTime(newTime);
    if (status !== "active") return;

    // Debounce: cancel any pending save and wait for the user to stop changing
    if (timeSaveTimer.current) clearTimeout(timeSaveTimer.current);
    timeSaveTimer.current = setTimeout(async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch("/api/push/subscribe", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationTime: newTime, timezone }),
        });
        if (res.ok) {
          setMessageType("success");
          setMessage(t("notif_time_saved"));
        } else {
          const data = await res.json() as { error?: string };
          setMessageType("error");
          setMessage(data.error ?? t("notif_test_failed"));
        }
      } catch (err) {
        console.error("[NotificationSettings] Time update failed:", err);
        setMessageType("error");
        setMessage(t("notif_test_failed"));
      }
    }, 600);
  }

  /**
   * Persists the "Due today" reminder toggle to the server.
   * Updates optimistically and rolls back on failure.
   */
  async function handleDueTodayToggle(next: boolean) {
    const previous = dueTodayEnabled;
    setDueTodayEnabled(next);
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueTodayReminderEnabled: next }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? t("notif_test_failed"));
      }
      setMessageType("success");
      setMessage(t("notif_due_today_saved"));
    } catch (err) {
      console.error("[NotificationSettings] Due-today toggle failed:", err);
      setDueTodayEnabled(previous);
      setMessageType("error");
      setMessage(
        err instanceof Error ? err.message : t("notif_test_failed")
      );
    }
  }

  /**
   * Persists the recurring-due individual reminder toggle to the server.
   * Updates optimistically and rolls back on failure.
   */
  async function handleRecurringDueToggle(next: boolean) {
    const previous = recurringDueEnabled;
    setRecurringDueEnabled(next);
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurringDueReminderEnabled: next }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? t("notif_test_failed"));
      }
      setMessageType("success");
      setMessage(t("notif_recurring_due_saved"));
    } catch (err) {
      console.error("[NotificationSettings] Recurring-due toggle failed:", err);
      setRecurringDueEnabled(previous);
      setMessageType("error");
      setMessage(
        err instanceof Error ? err.message : t("notif_test_failed")
      );
    }
  }

  /**
   * Persists the overdue reminder toggle to the server.
   * Updates optimistically and rolls back on failure.
   */
  async function handleOverdueToggle(next: boolean) {
    const previous = overdueEnabled;
    setOverdueEnabled(next);
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overdueReminderEnabled: next }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? t("notif_test_failed"));
      }
      setMessageType("success");
      setMessage(t("notif_overdue_saved"));
    } catch (err) {
      console.error("[NotificationSettings] Overdue toggle failed:", err);
      setOverdueEnabled(previous);
      setMessageType("error");
      setMessage(
        err instanceof Error ? err.message : t("notif_test_failed")
      );
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
        setMessageType("success");
        setMessage(t("notif_test_sent"));
      } else {
        setMessageType("error");
        setMessage(data.error ?? t("notif_test_failed"));
      }
    } catch {
      setMessageType("error");
      setMessage(t("notif_test_failed"));
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
          {t("notif_not_supported")}
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
          {t("notif_not_configured")}
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
              ? t("notif_active")
              : status === "denied"
              ? t("notif_denied")
              : t("notif_not_enabled")}
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
            {t("notif_daily_at")}
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

      {/*
        "Due today" reminder toggle — visible whenever the user has any
        delivery method (web push OR a configured channel). Silent on
        empty: the cron job only pings when at least one task is actually
        due today.
      */}
      {(status === "active" || hasAnyChannel) && (
        <div className="flex flex-col gap-1.5 pt-2">
          <label
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
          >
            <input
              type="checkbox"
              checked={dueTodayEnabled}
              onChange={(e) => handleDueTodayToggle(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: "var(--accent-green)" }}
            />
            {t("notif_due_today")}
          </label>
          <p
            className="text-xs ml-6"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            {t("notif_due_today_hint")}
          </p>
        </div>
      )}

      {/*
        Recurring-due individual reminder toggle — visible whenever the user
        has any delivery method. Sends one notification per recurring task
        that is due today (up to 3 individual, then bundled).
      */}
      {(status === "active" || hasAnyChannel) && (
        <div className="flex flex-col gap-1.5">
          <label
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
          >
            <input
              type="checkbox"
              checked={recurringDueEnabled}
              onChange={(e) => handleRecurringDueToggle(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: "var(--accent-green)" }}
            />
            {t("notif_recurring_due")}
          </label>
          <p
            className="text-xs ml-6"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            {t("notif_recurring_due_hint")}
          </p>
        </div>
      )}

      {/*
        Overdue reminder toggle — visible whenever the user has any delivery
        method. Notifies once a day about tasks past their due date (up to 30
        days back). Silent on empty: no ping when nothing is overdue.
      */}
      {(status === "active" || hasAnyChannel) && (
        <div className="flex flex-col gap-1.5">
          <label
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
          >
            <input
              type="checkbox"
              checked={overdueEnabled}
              onChange={(e) => handleOverdueToggle(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: "var(--accent-green)" }}
            />
            {t("notif_overdue")}
          </label>
          <p
            className="text-xs ml-6"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            {t("notif_overdue_hint")}
          </p>
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
              {t("notif_send_test")}
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
              {isSaving ? t("notif_disabling") : t("notif_disable")}
            </button>
          </>
        ) : status === "denied" ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            {t("notif_blocked")}
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
            {isSaving ? t("notif_enabling") : t("notif_enable")}
          </button>
        )}
      </div>

      {/* Feedback message */}
      {message && (
        <p
          className="text-sm"
          style={{
            color: messageType === "success" ? "var(--accent-green)" : "var(--accent-red)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
