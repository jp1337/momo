"use client";

/**
 * TopicForm component — modal form for creating and editing topics.
 *
 * Handles both create (no initialData) and edit (with initialData) modes.
 * Submits to POST /api/topics or PATCH /api/topics/:id.
 */

import { useState, useEffect, useRef } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";

interface TopicFormData {
  title: string;
  description: string;
  color: string;
  icon: string;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
}

interface TopicFormProps {
  /** If provided, the form is in edit mode */
  initialData?: Partial<TopicFormData> & { id?: string };
  /** Called when the form is successfully submitted */
  onSuccess: () => void;
  /** Called when the modal should be closed without saving */
  onCancel: () => void;
}

const DEFAULT_FORM: TopicFormData = {
  title: "",
  description: "",
  color: "#4a8c5c",
  icon: "📁",
  priority: "NORMAL",
};

/** Preset color options */
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

/**
 * Modal form for creating or editing a topic.
 */
export function TopicForm({
  initialData,
  onSuccess,
  onCancel,
}: TopicFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<TopicFormData>({
    ...DEFAULT_FORM,
    ...initialData,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // Close picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    setFormData({ ...DEFAULT_FORM, ...initialData });
  }, [initialData]);

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

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      color: formData.color || null,
      icon: formData.icon.trim() || null,
      priority: formData.priority,
    };

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/topics/${initialData!.id}`
        : "/api/topics";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Failed to save topic");
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-lg"
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
            {isEditing ? "Edit Topic" : "New Topic"}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg"
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
            <label htmlFor="topic-title" style={labelStyle}>
              Title <span style={{ color: "var(--accent-red)" }}>*</span>
            </label>
            <input
              id="topic-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Tax Return, Moving, Health"
              autoFocus
              style={inputStyle}
              maxLength={100}
            />
          </div>

          {/* Icon + Color row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Icon (emoji)</label>
              <div ref={emojiPickerRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  style={{
                    ...inputStyle,
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    width: "100%",
                  }}
                  title="Pick an emoji"
                >
                  <span>{formData.icon || "📁"}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>▾</span>
                </button>
                {showEmojiPicker && (
                  <div style={{ position: "absolute", zIndex: 1000, top: "calc(100% + 4px)", left: 0 }}>
                    <EmojiPicker
                      theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
                      onEmojiClick={(data: EmojiClickData) => {
                        setFormData((prev) => ({ ...prev, icon: data.emoji }));
                        setShowEmojiPicker(false);
                      }}
                      width={300}
                      height={380}
                      searchDisabled={false}
                      skinTonesDisabled
                      lazyLoadEmojis
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="topic-priority" style={labelStyle}>
                Priority
              </label>
              <select
                id="topic-priority"
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

          {/* Color picker */}
          <div>
            <label style={labelStyle}>Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, color: preset }))
                  }
                  className="w-7 h-7 rounded-full transition-transform duration-150"
                  style={{
                    backgroundColor: preset,
                    transform:
                      formData.color === preset ? "scale(1.25)" : "scale(1)",
                    outline:
                      formData.color === preset
                        ? `2px solid ${preset}`
                        : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label={`Select color ${preset}`}
                  title={preset}
                />
              ))}
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, color: e.target.value }))
                }
                className="w-7 h-7 rounded-full cursor-pointer border-0"
                style={{ padding: 0 }}
                title="Custom color"
                aria-label="Custom color picker"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="topic-description" style={labelStyle}>
              Description
            </label>
            <textarea
              id="topic-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="Optional description..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
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
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
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
                : "Create topic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
