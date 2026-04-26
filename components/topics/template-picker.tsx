"use client";

/**
 * TemplatePicker — modal to start a new topic from a curated template or blank.
 *
 * Shows all available templates as clickable cards plus a "Leer starten" option.
 * On template selection: POSTs to /api/topics/import-template.
 * On blank: calls onStartBlank() so the parent can open the TopicForm.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListOl, faPlus } from "@fortawesome/free-solid-svg-icons";
import { resolveTopicIcon } from "@/lib/topic-icons";

type TemplateKey = "moving" | "taxes" | "fitness" | "household" | "selling";

const CLIENT_TEMPLATES: {
  key: TemplateKey;
  icon: string;
  color: string;
  sequential: boolean;
  taskCount: number;
}[] = [
  { key: "moving",    icon: "house",    color: "#c97b3e", sequential: true,  taskCount: 10 },
  { key: "taxes",     icon: "coins",    color: "#4a8c5c", sequential: true,  taskCount: 6  },
  { key: "fitness",   icon: "dumbbell", color: "#8a5cf0", sequential: false, taskCount: 7  },
  { key: "household", icon: "broom",    color: "#5c8ab8", sequential: false, taskCount: 6  },
  { key: "selling",   icon: "tag",      color: "#b87c3e", sequential: true,  taskCount: 5  },
];

interface TemplatePickerProps {
  /** Called after a successful template import. */
  onImported: () => void;
  /** Called when the user wants to create a blank topic instead. */
  onStartBlank: () => void;
  /** Called when the modal should close without action. */
  onCancel: () => void;
}

/**
 * Modal to start a new topic — pick a template or create blank.
 */
export function TemplatePicker({ onImported, onStartBlank, onCancel }: TemplatePickerProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("topics");

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
        <p
          className="text-sm mb-5"
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

        {/* Divider + blank start */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui, 'DM Sans', sans-serif)" }}
          >
            {tc("template_picker_or")}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        </div>

        <button
          onClick={onStartBlank}
          disabled={!!importingKey}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
            color: "var(--text-primary)",
            cursor: importingKey ? "not-allowed" : "pointer",
            opacity: importingKey ? 0.5 : 1,
          }}
        >
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: 14, color: "var(--accent-amber)" }} />
          {tc("start_blank")}
        </button>
      </div>
    </div>
  );
}
