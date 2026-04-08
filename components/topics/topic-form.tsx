"use client";

/**
 * TopicForm component — modal form for creating and editing topics.
 *
 * Handles both create (no initialData) and edit (with initialData) modes.
 * Submits to POST /api/topics or PATCH /api/topics/:id.
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { IconPicker } from "@/components/topics/icon-picker";

interface TopicFormData {
  title: string;
  description: string;
  color: string;
  icon: string;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  defaultEnergyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  sequential: boolean;
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
  icon: "folder",
  priority: "NORMAL",
  defaultEnergyLevel: null,
  sequential: false,
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
  const t = useTranslations("topics");
  const tc = useTranslations("common");
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<TopicFormData>({
    ...DEFAULT_FORM,
    ...initialData,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setError(t("form_error_title"));
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      color: formData.color || null,
      icon: formData.icon.trim() || null,
      priority: formData.priority,
      defaultEnergyLevel: formData.defaultEnergyLevel,
      sequential: formData.sequential,
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
        setError(data.error ?? t("form_error_title"));
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
            {isEditing ? t("form_title_edit") : t("form_title_new")}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg"
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
              backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
              color: "var(--accent-red)",
              border: "1px solid color-mix(in srgb, var(--accent-red) 30%, transparent)",
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
              {t("form_label_title")} <span style={{ color: "var(--accent-red)" }}>*</span>
            </label>
            <input
              id="topic-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder={t("form_placeholder_title")}
              autoFocus
              style={inputStyle}
              maxLength={100}
            />
          </div>

          {/* Icon + Color row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>{t("form_label_icon")}</label>
              <IconPicker
                value={formData.icon}
                onChange={(key) => setFormData((prev) => ({ ...prev, icon: key }))}
              />
            </div>

            <div>
              <label htmlFor="topic-priority" style={labelStyle}>
                {t("form_label_priority")}
              </label>
              <select
                id="topic-priority"
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

          {/* Color picker */}
          <div>
            <label style={labelStyle}>{t("form_label_color")}</label>
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
                  aria-label={t("form_aria_color_preset", { color: preset })}
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
                title={t("form_aria_colorpicker")}
                aria-label={t("form_aria_colorpicker")}
              />
            </div>
          </div>

          {/* Default energy level — inherited by new tasks in this topic */}
          <div>
            <label style={labelStyle}>{t("form_label_default_energy")}</label>
            <div className="flex gap-2 flex-wrap">
              {([null, "HIGH", "MEDIUM", "LOW"] as const).map((level) => {
                const isSelected = formData.defaultEnergyLevel === level;
                return (
                  <button
                    key={String(level)}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, defaultEnergyLevel: level }))
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
                      cursor: "pointer",
                    }}
                  >
                    {level === null
                      ? t("form_default_energy_none")
                      : t(`energy_${level.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low")}
                  </button>
                );
              })}
            </div>
            <p
              className="text-xs mt-1.5"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("form_default_energy_hint")}
            </p>
          </div>

          {/* Sequential toggle */}
          <div>
            <label
              htmlFor="topic-sequential"
              className="flex items-center gap-2.5 cursor-pointer"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              <input
                id="topic-sequential"
                type="checkbox"
                checked={formData.sequential}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sequential: e.target.checked }))
                }
                style={{
                  width: "16px",
                  height: "16px",
                  accentColor: "var(--accent-amber)",
                  cursor: "pointer",
                }}
              />
              {t("form_label_sequential")}
            </label>
            <p
              className="text-xs mt-1.5 ml-6"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("form_sequential_hint")}
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="topic-description" style={labelStyle}>
              {t("form_label_description")}
            </label>
            <textarea
              id="topic-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder={t("form_placeholder_desc")}
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
              {tc("cancel")}
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
