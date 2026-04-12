"use client";

/**
 * LoginNotificationSettings component.
 *
 * Renders a toggle that enables/disables login notifications for new devices.
 * When active, the user receives a notification on all configured channels
 * whenever a login is detected from a previously unseen device fingerprint.
 *
 * @module components/settings/login-notification-settings
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface LoginNotificationSettingsProps {
  /** Current value from the DB */
  initialEnabled: boolean;
}

/**
 * Toggle for the new-device login notification setting.
 *
 * @param props - Component props
 * @returns Settings toggle row
 */
export function LoginNotificationSettings({
  initialEnabled,
}: LoginNotificationSettingsProps) {
  const t = useTranslations("settings");

  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const save = useCallback(async (value: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/login-notification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setEnabled(value);
      setMessageType("success");
      setMessage(t("login_notification_saved"));
    } catch {
      setMessageType("error");
      setMessage(t("login_notification_error"));
    } finally {
      setSaving(false);
    }
  }, [t]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
          >
            {t("login_notification_label")}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            {t("login_notification_description")}
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={() => save(!enabled)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: enabled ? "var(--accent-green)" : "var(--border)",
          }}
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200"
            style={{
              backgroundColor: "white",
              transform: enabled ? "translateX(20px)" : "translateX(0px)",
            }}
          />
        </button>
      </div>

      {/* Status message */}
      {message && (
        <p
          className="text-xs"
          style={{
            color: messageType === "success" ? "var(--accent-green)" : "var(--accent-red, #ef4444)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
