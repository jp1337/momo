"use client";

/**
 * TaskForm component — modal form for creating and editing tasks.
 *
 * Handles both create (no initialData) and edit (with initialData) modes.
 * Validates inputs client-side before submitting to the API.
 * Closes the modal on successful save.
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface TopicOption {
  id: string;
  title: string;
  color?: string | null;
}

interface TaskFormData {
  title: string;
  topicId: string | null;
  notes: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  recurrenceInterval: string;
  dueDate: string;
  coinValue: string;
  estimatedMinutes: 5 | 15 | 30 | 60 | null;
}

interface TaskFormProps {
  /** If provided, the form is in edit mode */
  initialData?: Partial<TaskFormData> & { id?: string };
  /** Available topics for selection */
  topics: TopicOption[];
  /** Pre-selected topic ID (e.g. when adding from topic detail page) */
  defaultTopicId?: string | null;
  /** Called when the form is successfully submitted */
  onSuccess: () => void;
  /** Called when the modal should be closed without saving */
  onCancel: () => void;
}

/**
 * Default empty form state.
 */
const DEFAULT_FORM: TaskFormData = {
  title: "",
  topicId: null,
  notes: "",
  type: "ONE_TIME",
  priority: "NORMAL",
  recurrenceInterval: "7",
  dueDate: "",
  coinValue: "1",
  estimatedMinutes: null,
};

/**
 * Modal form for creating or editing a task.
 * Submits to POST /api/tasks or PATCH /api/tasks/:id.
 */
export function TaskForm({
  initialData,
  topics,
  defaultTopicId,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");

  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<TaskFormData>({
    ...DEFAULT_FORM,
    topicId: defaultTopicId ?? null,
    ...initialData,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      ...DEFAULT_FORM,
      topicId: defaultTopicId ?? null,
      ...initialData,
    });
  }, [initialData, defaultTopicId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError(t("form_error_title"));
      return;
    }

    if (formData.type === "RECURRING" && !formData.recurrenceInterval) {
      setError(t("form_error_interval"));
      return;
    }

    const payload = {
      title: formData.title.trim(),
      topicId: formData.topicId || null,
      notes: formData.notes.trim() || null,
      type: formData.type,
      priority: formData.priority,
      recurrenceInterval:
        formData.type === "RECURRING"
          ? parseInt(formData.recurrenceInterval, 10)
          : null,
      dueDate: formData.dueDate || null,
      coinValue: parseInt(formData.coinValue, 10) || 1,
      estimatedMinutes: formData.estimatedMinutes,
    };

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/tasks/${initialData!.id}`
        : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? tc("error_network"));
        return;
      }

      onSuccess();
    } catch {
      setError(tc("error_network"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "6px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
  };

  return (
    /* Backdrop — scrollable so content is always reachable on small screens */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Modal — bottom-sheet on mobile, centered card on sm+ */}
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-lg"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {isEditing ? t("form_title_edit") : t("form_title_new")}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label htmlFor="task-title" style={labelStyle}>
              {t("form_label_title")} <span style={{ color: "var(--accent-red)" }}>*</span>
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder={t("form_placeholder_title")}
              autoFocus
              style={{
                ...inputStyle,
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              }}
              maxLength={255}
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-type" style={labelStyle}>
                {t("form_label_type")}
              </label>
              <select
                id="task-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="ONE_TIME">{t("form_type_onetime")}</option>
                <option value="RECURRING">{t("form_type_recurring")}</option>
                <option value="DAILY_ELIGIBLE">{t("form_type_daily")}</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" style={labelStyle}>
                {t("form_label_priority")}
              </label>
              <select
                id="task-priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="HIGH">{t("priority_high")}</option>
                <option value="NORMAL">{t("priority_normal")}</option>
                <option value="SOMEDAY">{t("priority_someday")}</option>
              </select>
            </div>
          </div>

          {/* Recurrence interval — only for RECURRING */}
          {formData.type === "RECURRING" && (
            <div>
              <label htmlFor="task-recurrence" style={labelStyle}>
                {t("form_label_interval")}{" "}
                <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              <input
                id="task-recurrence"
                name="recurrenceInterval"
                type="number"
                value={formData.recurrenceInterval}
                onChange={handleChange}
                min={1}
                max={365}
                style={inputStyle}
              />
            </div>
          )}

          {/* Topic */}
          <div>
            <label htmlFor="task-topic" style={labelStyle}>
              {t("form_label_topic")}
            </label>
            <select
              id="task-topic"
              name="topicId"
              value={formData.topicId ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  topicId: e.target.value || null,
                }))
              }
              style={inputStyle}
            >
              <option value="">{t("form_no_topic")}</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="task-due" style={labelStyle}>
              {t("form_label_due")}
            </label>
            <input
              id="task-due"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Coin value */}
          <div>
            <label htmlFor="task-coins" style={labelStyle}>
              {t("form_label_coins")}
            </label>
            <input
              id="task-coins"
              name="coinValue"
              type="number"
              value={formData.coinValue}
              onChange={handleChange}
              min={1}
              max={10}
              style={inputStyle}
            />
          </div>

          {/* Time estimate */}
          <div>
            <label style={labelStyle}>{t("form_label_duration")}</label>
            <div className="flex gap-2 flex-wrap">
              {([null, 5, 15, 30, 60] as const).map((min) => {
                const isSelected = formData.estimatedMinutes === min;
                return (
                  <button
                    key={String(min)}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, estimatedMinutes: min }))
                    }
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      border: isSelected
                        ? "1px solid var(--accent-amber)"
                        : "1px solid var(--border)",
                      backgroundColor: isSelected
                        ? "color-mix(in srgb, var(--accent-amber) 15%, var(--bg-elevated))"
                        : "var(--bg-elevated)",
                      color: isSelected ? "var(--accent-amber)" : "var(--text-muted)",
                    }}
                  >
                    {min === null ? t("duration_unknown") : `${min} min`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="task-notes" style={labelStyle}>
              {t("form_label_notes")}
            </label>
            <textarea
              id="task-notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder={t("form_placeholder_notes")}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />
          </div>

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
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--accent-amber)",
                color: "var(--bg-primary)",
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting
                ? t("form_saving")
                : isEditing
                ? t("form_save")
                : t("form_create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
