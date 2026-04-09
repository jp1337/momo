"use client";

/**
 * CreateTopicStep — second step of the onboarding wizard.
 * Simplified inline topic creation: title + icon + color.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconPicker } from "@/components/topics/icon-picker";

/** Preset color options (matches topic-form.tsx) */
const COLOR_PRESETS = [
  "#4a8c5c", // green
  "#f0a500", // amber
  "#b85450", // red
  "#5b8fc9", // blue
  "#9b59b6", // purple
  "#e67e22", // orange
  "#1abc9c", // teal
  "#e74c3c", // crimson
];

interface CreateTopicStepProps {
  onTopicCreated: (topicId: string, topicName: string) => void;
}

/**
 * Inline topic creation form for onboarding.
 *
 * @param onTopicCreated - Callback with the created topic's ID and name
 */
export function CreateTopicStep({ onTopicCreated }: CreateTopicStepProps) {
  const t = useTranslations("onboarding");

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          icon,
          color,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      const { topic } = await res.json();
      onTopicCreated(topic.id, topic.title);
    } catch {
      setError(t("topic_error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const labelStyle = {
    fontFamily: "var(--font-ui)",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    fontWeight: 500 as const,
  };

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
          {t("topic_title")}
        </h1>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
          }}
        >
          {t("topic_subtitle")}
        </p>
      </div>

      <div
        className="rounded-xl p-6 flex flex-col gap-5"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label style={labelStyle}>{t("topic_name_label")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("topic_name_placeholder")}
            maxLength={100}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) handleCreate();
            }}
            className="rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>

        {/* Icon + Color row */}
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>{t("topic_icon_label")}</label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <label style={labelStyle}>{t("topic_color_label")}</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className="rounded-full transition-transform"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: preset,
                    border:
                      color === preset
                        ? "3px solid var(--text-primary)"
                        : "3px solid transparent",
                    transform: color === preset ? "scale(1.15)" : "scale(1)",
                  }}
                  aria-label={preset}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={!title.trim() || isSubmitting}
          className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
          style={{
            backgroundColor: "var(--accent-amber)",
            color: "#1a1f1b",
            fontFamily: "var(--font-ui)",
          }}
        >
          {isSubmitting ? "..." : t("topic_title")}
        </button>

        {error && (
          <p
            className="text-xs text-center"
            style={{ color: "var(--accent-red)" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
