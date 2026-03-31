"use client";

/**
 * TaskForm component — modal form for creating and editing tasks.
 *
 * Handles both create (no initialData) and edit (with initialData) modes.
 * Validates inputs client-side before submitting to the API.
 * Closes the modal on successful save.
 */

import { useState, useEffect } from "react";

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
      setError("Title is required");
      return;
    }

    if (formData.type === "RECURRING" && !formData.recurrenceInterval) {
      setError("Recurrence interval is required for recurring tasks");
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
        setError(data.error ?? "Failed to save task");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error — please try again");
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
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Modal */}
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
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {isEditing ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
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
              Title <span style={{ color: "var(--accent-red)" }}>*</span>
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="What needs to be done?"
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
                Type
              </label>
              <select
                id="task-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="ONE_TIME">One-time</option>
                <option value="RECURRING">Recurring</option>
                <option value="DAILY_ELIGIBLE">Daily Quest</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-priority" style={labelStyle}>
                Priority
              </label>
              <select
                id="task-priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="SOMEDAY">Someday</option>
              </select>
            </div>
          </div>

          {/* Recurrence interval — only for RECURRING */}
          {formData.type === "RECURRING" && (
            <div>
              <label htmlFor="task-recurrence" style={labelStyle}>
                Repeat every (days){" "}
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
              Topic
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
              <option value="">No topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="task-due" style={labelStyle}>
              Due date
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
              Coin reward (1–10)
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

          {/* Notes */}
          <div>
            <label htmlFor="task-notes" style={labelStyle}>
              Notes
            </label>
            <textarea
              id="task-notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Optional notes..."
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
              Cancel
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
                ? "Saving..."
                : isEditing
                ? "Save changes"
                : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
