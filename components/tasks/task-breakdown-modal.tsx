"use client";

/**
 * TaskBreakdownModal — splits a task into multiple subtasks inside a new topic.
 *
 * User enters 2–10 subtask titles. On confirm, calls POST /api/tasks/:id/breakdown.
 * The original task is deleted and the user is redirected to the new topic.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface TaskBreakdownModalProps {
  /** The task to break down */
  task: { id: string; title: string };
  /** Called when the modal should be closed without saving */
  onCancel: () => void;
  /** Called after a successful breakdown (before navigation) */
  onSuccess?: () => void;
}

/**
 * Modal for breaking a task into subtasks.
 */
export function TaskBreakdownModal({ task, onCancel, onSuccess }: TaskBreakdownModalProps) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const router = useRouter();
  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function addStep() {
    if (steps.length < 10) {
      setSteps((prev) => [...prev, ""]);
    }
  }

  function removeStep(index: number) {
    if (steps.length > 2) {
      setSteps((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filledSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (filledSteps.length < 2) {
      setError(t("breakdown_min_hint"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/breakdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskTitles: filledSteps }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t("breakdown_error"));
        return;
      }

      const data = (await res.json()) as { topicId: string };
      onSuccess?.();
      router.push(`/topics?open=${data.topicId}`);
      router.refresh();
    } catch {
      setError(t("breakdown_error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-lg"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: "var(--text-primary)" }}
          >
            {t("breakdown_title")}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label={tc("close")}
          >
            ✕
          </button>
        </div>

        {/* Original task name */}
        <p
          className="text-sm mb-1"
          style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}
        >
          {t("breakdown_hint")}
        </p>
        <p
          className="text-sm font-medium mb-4 px-3 py-2 rounded-lg"
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            color: "var(--accent-amber)",
            backgroundColor: "color-mix(in srgb, var(--accent-amber) 10%, var(--bg-elevated))",
            border: "1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent)",
          }}
        >
          {task.title}
        </p>

        {/* Error */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: "rgba(184,84,80,0.12)",
              color: "var(--accent-red)",
              border: "1px solid rgba(184,84,80,0.3)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span
                className="text-xs w-6 text-center flex-shrink-0"
                style={{ fontFamily: "var(--font-ui)", color: "var(--text-muted)" }}
              >
                {index + 1}.
              </span>
              <input
                type="text"
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={`${t("breakdown_subtask_label", { n: index + 1 })}...`}
                style={inputStyle}
                maxLength={255}
                autoFocus={index === 0}
              />
              {steps.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="flex-shrink-0 text-lg leading-none"
                  style={{ color: "var(--text-muted)", opacity: 0.6 }}
                  aria-label="Remove step"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {/* Add step button */}
          {steps.length < 10 && (
            <button
              type="button"
              onClick={addStep}
              className="text-sm self-start transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--accent-amber)",
              }}
            >
              {t("breakdown_add_step")}
            </button>
          )}

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
              }}
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--accent-amber)",
                color: "#0f1410",
              }}
            >
              {isSubmitting ? tc("saving") : t("breakdown_confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
