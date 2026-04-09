"use client";

/**
 * TemplatePicker component — modal to import a predefined topic template.
 *
 * Displays the curated templates from `lib/templates.ts` as a grid of cards.
 * Each card shows the template icon, title, description, task count and
 * (if applicable) the sequential badge. Clicking "Import" POSTs to
 * `/api/topics/import-template` and signals success to the parent, which
 * refreshes the topics list.
 *
 * The template catalogue is intentionally mirrored on the client as a static
 * constant — there is no dedicated "list templates" endpoint because
 * templates are code, not user data. If the set changes on the server, update
 * both sides.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListOl } from "@fortawesome/free-solid-svg-icons";
import { resolveTopicIcon } from "@/lib/topic-icons";

type TemplateKey = "moving" | "taxes" | "fitness" | "household";

/**
 * Static client-side mirror of `lib/templates.ts`. Only the fields needed for
 * rendering the picker live here; titles/descriptions/task counts are fetched
 * via i18n and hardcoded counts respectively.
 */
const CLIENT_TEMPLATES: {
  key: TemplateKey;
  icon: string;
  color: string;
  sequential: boolean;
  taskCount: number;
}[] = [
  { key: "moving", icon: "house", color: "#c97b3e", sequential: true, taskCount: 10 },
  { key: "taxes", icon: "coins", color: "#4a8c5c", sequential: true, taskCount: 6 },
  { key: "fitness", icon: "dumbbell", color: "#8a5cf0", sequential: false, taskCount: 7 },
  { key: "household", icon: "broom", color: "#5c8ab8", sequential: false, taskCount: 6 },
];

interface TemplatePickerProps {
  /** Called after a successful import. */
  onImported: () => void;
  /** Called when the modal should close without importing. */
  onCancel: () => void;
}

/**
 * Modal that lets the user import a predefined topic template as a new topic.
 */
export function TemplatePicker({ onImported, onCancel }: TemplatePickerProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");

  const [importingKey, setImportingKey] = useState<TemplateKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (key: TemplateKey) => {
    setImportingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/topics/import-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: key }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      onImported();
    } catch {
      setError(t("import_failed"));
      setImportingKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importingKey) onCancel();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-6 shadow-lg"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2 gap-4">
          <h2
            className="text-xl font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("picker_title")}
          </h2>
          <button
            onClick={onCancel}
            disabled={!!importingKey}
            className="p-1 rounded-lg"
            style={{ color: "var(--text-muted)" }}
            aria-label={tc("close")}
          >
            ✕
          </button>
        </div>
        <p
          className="text-sm mb-6"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
        >
          {t("picker_subtitle")}
        </p>

        {/* Error */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
              color: "var(--accent-red)",
              border: "1px solid color-mix(in srgb, var(--accent-red) 30%, transparent)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
          >
            {error}
          </div>
        )}

        {/* Template grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CLIENT_TEMPLATES.map((tpl) => {
            const isImporting = importingKey === tpl.key;
            const isDisabled = !!importingKey;
            return (
              <div
                key={tpl.key}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex items-center justify-center rounded-lg shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: `color-mix(in srgb, ${tpl.color} 20%, transparent)`,
                      color: tpl.color,
                    }}
                    aria-hidden
                  >
                    <FontAwesomeIcon icon={resolveTopicIcon(tpl.icon)} style={{ fontSize: 20 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-base font-semibold leading-tight"
                      style={{
                        fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {t(`${tpl.key}.title`)}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-xs"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        }}
                      >
                        {t("tasks_count", { count: tpl.taskCount })}
                      </span>
                      {tpl.sequential && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--accent-amber) 18%, transparent)",
                            color: "var(--accent-amber)",
                            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          }}
                        >
                          <FontAwesomeIcon icon={faListOl} style={{ fontSize: 9 }} />
                          {t("sequential_badge")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: "var(--text-secondary, var(--text-muted))",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  }}
                >
                  {t(`${tpl.key}.description`)}
                </p>
                <button
                  onClick={() => handleImport(tpl.key)}
                  disabled={isDisabled}
                  className="mt-1 px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    backgroundColor: tpl.color,
                    color: "#ffffff",
                    opacity: isDisabled && !isImporting ? 0.5 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {isImporting ? t("importing") : t("import")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
