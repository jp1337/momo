"use client";

/**
 * EmotionalClosureSettings component — toggle to enable/disable the
 * affirmation/quote shown after completing the daily quest.
 *
 * PATCHes /api/settings/quest on change.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

interface EmotionalClosureSettingsProps {
  /** Current setting from DB */
  initialEnabled: boolean;
}

/**
 * Toggle switch for the emotional closure feature.
 * Matching the chip pattern used by LanguageSwitcher and QuestSettings.
 */
export function EmotionalClosureSettings({ initialEnabled }: EmotionalClosureSettingsProps) {
  const t = useTranslations("closure");
  const tSettings = useTranslations("settings");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleToggle(newValue: boolean) {
    setEnabled(newValue);
    setStatus("saving");

    try {
      await fetch("/api/settings/quest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotionalClosureEnabled: newValue }),
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-2">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            onClick={() => handleToggle(value)}
            disabled={status === "saving"}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
            style={{
              fontFamily: "var(--font-ui)",
              border: enabled === value ? "1px solid var(--accent-amber)" : "1px solid var(--border)",
              backgroundColor:
                enabled === value
                  ? "color-mix(in srgb, var(--accent-amber) 15%, var(--bg-elevated))"
                  : "var(--bg-elevated)",
              color: enabled === value ? "var(--accent-amber)" : "var(--text-muted)",
            }}
          >
            {value ? t("setting_on") : t("setting_off")}
          </button>
        ))}
      </div>

      {status !== "idle" && (
        <span
          className="text-xs"
          style={{
            fontFamily: "var(--font-ui)",
            color: status === "saved" ? "var(--accent-green)" : "var(--text-muted)",
          }}
        >
          {status === "saving" ? tSettings("quest_saving") : tSettings("quest_saved")}
        </span>
      )}
    </div>
  );
}
