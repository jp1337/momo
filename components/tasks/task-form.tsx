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
  /** Topic's default energy level — surfaces as a hint in the energy picker
   *  when the user has not chosen one explicitly. */
  defaultEnergyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
}

interface TaskFormData {
  title: string;
  topicId: string | null;
  notes: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  recurrenceInterval: string;
  recurrenceType: "INTERVAL" | "WEEKDAY" | "MONTHLY" | "YEARLY";
  recurrenceWeekdays: number[];
  recurrenceFixed: boolean;
  dueDate: string;
  coinValue: string;
  estimatedMinutes: 5 | 15 | 30 | 60 | null;
  energyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  taskGroup: string;
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
  /** Existing group names in the current topic for autocomplete suggestions */
  existingGroups?: string[];
}

/** Weekday indices 0=Mon…6=Sun with their translation key suffixes */
const WEEKDAYS = [
  { idx: 0, key: "recurrence_weekday_mon" },
  { idx: 1, key: "recurrence_weekday_tue" },
  { idx: 2, key: "recurrence_weekday_wed" },
  { idx: 3, key: "recurrence_weekday_thu" },
  { idx: 4, key: "recurrence_weekday_fri" },
  { idx: 5, key: "recurrence_weekday_sat" },
  { idx: 6, key: "recurrence_weekday_sun" },
] as const;

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
  recurrenceType: "INTERVAL",
  recurrenceWeekdays: [],
  recurrenceFixed: false,
  dueDate: "",
  coinValue: "1",
  estimatedMinutes: null,
  energyLevel: null,
  taskGroup: "",
};

/** Extracts the group prefix from a task title: "Unifi AP: Marktpreis" → "Unifi AP" */
function detectGroupFromTitle(title: string): string {
  const colonIdx = title.indexOf(": ");
  if (colonIdx > 0 && colonIdx < 60) return title.slice(0, colonIdx).trim();
  const dashIdx = title.indexOf(" - ");
  if (dashIdx > 0 && dashIdx < 60) return title.slice(0, dashIdx).trim();
  return "";
}

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
  existingGroups = [],
}: TaskFormProps) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const tg = useTranslations("task_group");

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

    if (formData.type === "RECURRING") {
      const rType = formData.recurrenceType;
      if (rType === "INTERVAL" && !formData.recurrenceInterval) {
        setError(t("form_error_interval"));
        return;
      }
      if (rType === "WEEKDAY" && formData.recurrenceWeekdays.length === 0) {
        setError(t("recurrence_weekday_error"));
        return;
      }
    }

    const payload: Record<string, unknown> = {
      title: formData.title.trim(),
      topicId: formData.topicId || null,
      notes: formData.notes.trim() || null,
      type: formData.type,
      priority: formData.priority,
      recurrenceInterval:
        formData.type === "RECURRING" && formData.recurrenceType === "INTERVAL"
          ? parseInt(formData.recurrenceInterval, 10)
          : null,
      recurrenceType: formData.type === "RECURRING" ? formData.recurrenceType : undefined,
      recurrenceWeekdays:
        formData.type === "RECURRING" && formData.recurrenceType === "WEEKDAY"
          ? formData.recurrenceWeekdays
          : undefined,
      recurrenceFixed:
        formData.type === "RECURRING" &&
        (formData.recurrenceType === "MONTHLY" || formData.recurrenceType === "YEARLY")
          ? formData.recurrenceFixed
          : undefined,
      dueDate: formData.dueDate || null,
      coinValue: parseInt(formData.coinValue, 10) || 1,
      estimatedMinutes: formData.estimatedMinutes,
      energyLevel: formData.energyLevel,
      taskGroup: formData.taskGroup.trim() || null,
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
    /*
      Backdrop — only provides the dimmed overlay on sm+.
      On mobile the form is fixed full-screen, so the backdrop is just cosmetic.
    */
    <div
      className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/*
        Mobile  : fixed inset-0 → explicit 100dvh height → flex-1 resolves correctly
        Desktop : static, max-h-[90dvh], centered by the backdrop flex container
        The header and footer use flex-shrink-0; only the fields div scrolls.
      */}
      <form
        onSubmit={handleSubmit}
        className="
          fixed inset-0 flex flex-col
          sm:static sm:inset-auto sm:w-full sm:max-w-lg sm:rounded-2xl sm:max-h-[90dvh]
          shadow-lg
        "
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header — never scrolls */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
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
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label={tc("close")}
          >
            ✕
          </button>
        </div>

        {/* Scrollable fields area */}
        <div className="flex flex-col gap-4 overflow-y-auto px-6 pb-2 flex-1">
          {/* Error */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
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

          {/* Recurrence configuration — only for RECURRING */}
          {formData.type === "RECURRING" && (
            <div className="flex flex-col gap-3">
              {/* Recurrence type selector */}
              <div>
                <label style={labelStyle}>
                  {t("recurrence_type_label")}{" "}
                  <span style={{ color: "var(--accent-red)" }}>*</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {(["INTERVAL", "WEEKDAY", "MONTHLY", "YEARLY"] as const).map((rType) => {
                    const isSelected = formData.recurrenceType === rType;
                    const labelKey = `recurrence_type_${rType.toLowerCase()}` as
                      | "recurrence_type_interval"
                      | "recurrence_type_weekday"
                      | "recurrence_type_monthly"
                      | "recurrence_type_yearly";
                    return (
                      <button
                        key={rType}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            recurrenceType: rType,
                            // Reset weekdays when switching away from WEEKDAY
                            recurrenceWeekdays: rType === "WEEKDAY" ? prev.recurrenceWeekdays : [],
                          }))
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
                        {t(labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* INTERVAL: days input */}
              {formData.recurrenceType === "INTERVAL" && (
                <div>
                  <label htmlFor="task-recurrence" style={labelStyle}>
                    {t("form_label_interval")}
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

              {/* WEEKDAY: day toggle buttons */}
              {formData.recurrenceType === "WEEKDAY" && (
                <div>
                  <label style={labelStyle}>{t("recurrence_weekday_label")}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {WEEKDAYS.map(({ idx, key }) => {
                      const isSelected = formData.recurrenceWeekdays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              recurrenceWeekdays: isSelected
                                ? prev.recurrenceWeekdays.filter((d) => d !== idx)
                                : [...prev.recurrenceWeekdays, idx].sort((a, b) => a - b),
                            }))
                          }
                          className="w-10 h-10 rounded-lg text-sm font-semibold transition-all duration-150"
                          style={{
                            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                            border: isSelected
                              ? "1px solid var(--accent-amber)"
                              : "1px solid var(--border)",
                            backgroundColor: isSelected
                              ? "color-mix(in srgb, var(--accent-amber) 20%, var(--bg-elevated))"
                              : "var(--bg-elevated)",
                            color: isSelected ? "var(--accent-amber)" : "var(--text-muted)",
                          }}
                        >
                          {t(key as Parameters<typeof t>[0])}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MONTHLY / YEARLY: fixed vs. rolling toggle */}
              {(formData.recurrenceType === "MONTHLY" || formData.recurrenceType === "YEARLY") && (
                <div>
                  <p
                    className="text-sm mb-2"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    }}
                  >
                    {formData.recurrenceType === "MONTHLY"
                      ? t("recurrence_monthly_hint")
                      : t("recurrence_yearly_hint")}
                  </p>
                  <label
                    className="flex items-center gap-2 cursor-pointer"
                    style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)" }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.recurrenceFixed}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, recurrenceFixed: e.target.checked }))
                      }
                      style={{ accentColor: "var(--accent-amber)" }}
                    />
                    <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                      {t("recurrence_fixed_label")}
                    </span>
                  </label>
                  <p
                    className="text-xs mt-1"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    }}
                  >
                    {formData.recurrenceFixed
                      ? t("recurrence_fixed_hint")
                      : t("recurrence_rolling_hint")}
                  </p>
                </div>
              )}
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

          {/* Energy level */}
          <div>
            <label style={labelStyle}>{t("form_label_energy")}</label>
            <div className="flex gap-2 flex-wrap">
              {([null, "HIGH", "MEDIUM", "LOW"] as const).map((level) => {
                const isSelected = formData.energyLevel === level;
                return (
                  <button
                    key={String(level)}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, energyLevel: level }))
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
                    {level === null
                      ? t("energy_any")
                      : t(`energy_${level.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low")}
                  </button>
                );
              })}
            </div>
            {/* Topic-default hint: if the picked topic has a defaultEnergyLevel
                and the user has not picked one for this task, show what will
                be inherited on save. */}
            {formData.energyLevel === null && formData.topicId && (() => {
              const selectedTopic = topics.find((tp) => tp.id === formData.topicId);
              if (!selectedTopic?.defaultEnergyLevel) return null;
              return (
                <p
                  className="text-xs mt-1.5"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--accent-amber)",
                  }}
                >
                  {t("form_energy_topic_default_hint", {
                    level: t(`energy_${selectedTopic.defaultEnergyLevel.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low"),
                    topic: selectedTopic.title,
                  })}
                </p>
              );
            })()}
          </div>

          {/* Task Group — only shown when a topic is selected */}
          {formData.topicId && (
            <div>
              <label htmlFor="task-group" style={labelStyle}>
                {tg("label")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="task-group"
                  name="taskGroup"
                  type="text"
                  list="task-group-suggestions"
                  value={formData.taskGroup}
                  onChange={handleChange}
                  placeholder={tg("placeholder")}
                  style={inputStyle}
                  autoComplete="off"
                />
                <datalist id="task-group-suggestions">
                  {existingGroups.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
              {/* Auto-detect from title */}
              {!formData.taskGroup && detectGroupFromTitle(formData.title) && (
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      taskGroup: detectGroupFromTitle(prev.title),
                    }))
                  }
                  style={{
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "var(--accent-amber)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  }}
                >
                  ↳ {tg("auto_detect")}: &bdquo;{detectGroupFromTitle(formData.title)}&ldquo;
                </button>
              )}
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", fontFamily: "var(--font-ui)" }}>
                {tg("hint")}
              </p>
            </div>
          )}

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
        </div>

        {/* Footer buttons — always visible, never scrolls */}
        <div
          className="flex gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
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
            className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
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
  );
}
