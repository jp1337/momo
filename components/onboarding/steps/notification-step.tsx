"use client";

/**
 * NotificationStep — fourth step of the onboarding wizard.
 * Simplified push notification toggle + timezone detection.
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faBellSlash, faGlobe } from "@fortawesome/free-solid-svg-icons";

type PushState = "loading" | "unsupported" | "denied" | "available" | "enabled";

/**
 * Simplified notification settings for onboarding.
 * Detects timezone and offers a web push toggle.
 */
export function NotificationStep() {
  const t = useTranslations("onboarding");

  const [timezone, setTimezone] = useState<string>("");
  const [pushState, setPushState] = useState<PushState>("loading");
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    // Detect timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);

    // Check push support
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setPushState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setPushState("denied");
    } else if (Notification.permission === "granted") {
      // Already granted in a previous session — check if subscription exists
      setPushState("enabled");
    } else {
      setPushState("available");
    }
  }, []);

  async function handleEnablePush() {
    setIsEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("denied");
        setIsEnabling(false);
        return;
      }

      // Get service worker and subscribe
      const swTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SW timeout")), 5000),
      );
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        swTimeout,
      ]);

      // Fetch VAPID key from the subscribe endpoint's source
      // We need it from the server — try a quick fetch
      const configRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          notificationTime: "09:00",
          enabled: true,
        }),
      });

      // If the server returns an error about missing subscription,
      // we need VAPID. For simplicity in onboarding, we'll just POST
      // to mark the user as wanting notifications and let the full
      // settings page handle the subscription details.
      if (configRes.ok) {
        setPushState("enabled");
      } else {
        // Try subscribing with PushManager if VAPID is available
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          // Already subscribed — just update server
          const subJSON = existingSub.toJSON();
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subJSON.endpoint,
              keys: subJSON.keys,
              timezone,
              notificationTime: "09:00",
              enabled: true,
            }),
          });
          setPushState("enabled");
        } else {
          // Can't subscribe without VAPID key in onboarding
          // Just mark as available and let settings handle it
          setPushState("available");
        }
      }
    } catch {
      // Non-critical — notifications are optional
      setPushState("available");
    } finally {
      setIsEnabling(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center flex flex-col gap-2">
        <h1
          className="text-2xl font-semibold"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--text-primary)",
          }}
        >
          {t("notifications_title")}
        </h1>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
          }}
        >
          {t("notifications_subtitle")}
        </p>
      </div>

      <div
        className="rounded-xl p-6 flex flex-col gap-5"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Timezone */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-green) 18%, transparent)",
            }}
          >
            <FontAwesomeIcon
              icon={faGlobe}
              style={{ color: "var(--accent-green)", fontSize: 16 }}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span
              className="text-xs font-medium"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
              }}
            >
              {t("notifications_timezone_label")}
            </span>
            <span
              className="text-sm"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--text-primary)",
              }}
            >
              {timezone || "..."}
            </span>
          </div>
        </div>

        {/* Push notification toggle */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-amber) 18%, transparent)",
            }}
          >
            <FontAwesomeIcon
              icon={pushState === "enabled" ? faBell : faBellSlash}
              style={{ color: "var(--accent-amber)", fontSize: 16 }}
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <span
              className="text-sm font-medium"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-primary)",
              }}
            >
              {t("notifications_push_label")}
            </span>
            <span
              className="text-xs"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
              }}
            >
              {pushState === "denied"
                ? t("notifications_push_denied")
                : pushState === "unsupported"
                  ? t("notifications_push_unsupported")
                  : pushState === "enabled"
                    ? t("notifications_push_enabled")
                    : t("notifications_push_hint")}
            </span>
          </div>

          {pushState === "available" && (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isEnabling}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-40"
              style={{
                backgroundColor: "var(--accent-amber)",
                color: "#1a1f1b",
                fontFamily: "var(--font-ui)",
              }}
            >
              {isEnabling ? "..." : t("next")}
            </button>
          )}

          {pushState === "enabled" && (
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent-green) 20%, transparent)",
                color: "var(--accent-green)",
              }}
            >
              ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
