"use client";

/**
 * MorningBriefingSettings component.
 *
 * Renders the morning briefing (daily digest) toggle and time picker.
 * Visible only when the user has at least one notification delivery method
 * (Web Push or a configured notification channel).
 *
 * When enabled, the morning briefing replaces the individual daily-quest
 * and due-today reminder pushes with a single consolidated digest.
 *
 * @module components/settings/morning-briefing-settings
 */

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

interface MorningBriefingSettingsProps {
  /** Whether morning briefing is currently enabled (from DB) */
  initialEnabled: boolean;
  /** Current briefing time from DB (HH:MM) */
  initialTime: string;
}

/**
 * Morning briefing settings: enable toggle + time picker.
 *
 * @param props - Component props
 * @returns Morning briefing settings section
 */
export function MorningBriefingSettings({
  initialEnabled,
  initialTime,
}: MorningBriefingSettingsProps) {
  const t = useTranslations("settings");

  const [enabled, setEnabled] = useState(initialEnabled);
  const [briefingTime, setBriefingTime] = useState(
    (initialTime || "08:00").slice(0, 5)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  // Debounce timer for time changes
  const timeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Persist a setting change to the server. */
  const save = useCallback(
    async (updates: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/push/subscribe", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setMessageType("success");
        setMessage(t("morning_briefing_saved"));
      } catch (err) {
        console.error("[MorningBriefingSettings] Save failed:", err);
        setMessageType("error");
        setMessage(
          err instanceof Error ? err.message : "Save failed"
        );
        return false;
      }
      return true;
    },
    [t]
  );

  /** Toggle morning briefing on/off with optimistic update. */
  async function handleToggle(next: boolean) {
    const previous = enabled;
    setEnabled(next);
    const ok = await save({ morningBriefingEnabled: next });
    if (!ok) setEnabled(previous);
  }

  /** Debounced time change handler. */
  function handleTimeChange(value: string) {
    setBriefingTime(value);
    if (timeDebounceRef.current) clearTimeout(timeDebounceRef.current);
    timeDebounceRef.current = setTimeout(() => {
      save({ morningBriefingTime: value });
    }, 600);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle */}
      <label
        className="flex items-center gap-2 text-sm font-medium cursor-pointer"
        style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
          style={{ accentColor: "var(--accent-green)" }}
        />
        {t("morning_briefing_toggle")}
      </label>

      {/* Hint about replacing individual reminders */}
      <p
        className="text-xs ml-6"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
      >
        {t("morning_briefing_replaces_hint")}
      </p>

      {/* Time picker — only visible when enabled */}
      {enabled && (
        <div className="flex items-center gap-3 ml-6">
          <label
            className="text-sm"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("morning_briefing_time_label")}
          </label>
          <input
            type="time"
            value={briefingTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm border"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>
      )}

      {/* Status message */}
      {message && (
        <p
          className="text-xs ml-6"
          style={{
            color:
              messageType === "success"
                ? "var(--accent-green)"
                : "var(--accent-red)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
