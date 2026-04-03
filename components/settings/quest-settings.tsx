"use client";

/**
 * QuestSettings component — allows the user to configure how many times per day
 * they can postpone / swap their daily quest.
 *
 * PATCHes /api/settings/quest on change.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

interface QuestSettingsProps {
  /** Current configured postpone limit from DB (1–5) */
  initialPostponeLimit: number;
}

/**
 * Quest settings section for the settings page.
 * Lets the user configure the daily quest postpone limit (1–5).
 */
export function QuestSettings({ initialPostponeLimit }: QuestSettingsProps) {
  const t = useTranslations("settings");
  const [limit, setLimit] = useState(initialPostponeLimit);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function handleChange(newLimit: number) {
    setLimit(newLimit);
    setStatus("saving");

    try {
      await fetch("/api/settings/quest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postponeLimit: newLimit }),
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
        >
          {t("quest_postpone_limit_label")}
        </label>
        <p
          className="text-xs"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", opacity: 0.7 }}
        >
          {t("quest_postpone_limit_hint", { limit })}
        </p>
      </div>

      {/* Segmented control for 1–5 */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => handleChange(n)}
            disabled={status === "saving"}
            className="w-10 h-10 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50"
            style={{
              fontFamily: "var(--font-ui)",
              border: limit === n ? "1px solid var(--accent-amber)" : "1px solid var(--border)",
              backgroundColor:
                limit === n
                  ? "color-mix(in srgb, var(--accent-amber) 15%, var(--bg-elevated))"
                  : "var(--bg-elevated)",
              color: limit === n ? "var(--accent-amber)" : "var(--text-muted)",
            }}
          >
            {n}
          </button>
        ))}

        {status !== "idle" && (
          <span
            className="self-center text-xs ml-2"
            style={{
              fontFamily: "var(--font-ui)",
              color: status === "saved" ? "var(--accent-green)" : "var(--text-muted)",
            }}
          >
            {status === "saving" ? t("quest_saving") : t("quest_saved")}
          </span>
        )}
      </div>
    </div>
  );
}
