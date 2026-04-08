"use client";

/**
 * TopicCard component — displays a topic in the topics grid.
 *
 * Shows:
 * - Topic icon and color
 * - Title and description
 * - Priority badge
 * - Progress bar (X/Y tasks completed)
 * - View, Edit, and Delete action buttons
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListOl } from "@fortawesome/free-solid-svg-icons";
import { resolveTopicIcon } from "@/lib/topic-icons";

interface TopicCardProps {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  sequential?: boolean;
  taskCount: number;
  completedCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_STYLES = {
  HIGH: {
    color: "var(--accent-red)",
    backgroundColor: "color-mix(in srgb, var(--accent-red) 15%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-red) 25%, transparent)",
  },
  NORMAL: {
    color: "var(--accent-amber)",
    backgroundColor: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent)",
  },
  SOMEDAY: {
    color: "var(--text-muted)",
    backgroundColor: "color-mix(in srgb, var(--text-muted) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--text-muted) 20%, transparent)",
  },
} as const;

/**
 * Topic card component with progress bar and action buttons.
 */
export function TopicCard({
  id,
  title,
  description,
  color,
  icon,
  priority,
  sequential,
  taskCount,
  completedCount,
  onEdit,
  onDelete,
}: TopicCardProps) {
  const t = useTranslations("topics");

  const PRIORITY_LABELS: Record<"HIGH" | "NORMAL" | "SOMEDAY", string> = {
    HIGH: t("priority_high"),
    NORMAL: t("priority_normal"),
    SOMEDAY: t("priority_someday"),
  };

  const progressPercent =
    taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  const priorityStyle = PRIORITY_STYLES[priority];
  const priorityLabel = PRIORITY_LABELS[priority];
  const accentColor = color ?? "var(--accent-amber)";

  return (
    <div
      className="group rounded-2xl p-5 flex flex-col gap-4 transition-shadow duration-200"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: `1px solid var(--border)`,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Icon/Color circle */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{
            backgroundColor: color ? `${color}22` : "var(--bg-elevated)",
            border: `2px solid ${accentColor}44`,
          }}
          aria-hidden="true"
        >
          <FontAwesomeIcon
            icon={resolveTopicIcon(icon)}
            style={{ width: "1.1rem", height: "1.1rem", color: accentColor }}
          />
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-primary)",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {title}
          </h3>
          {description && (
            <p
              className="text-sm mt-0.5 line-clamp-2"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Action buttons — always visible for touch and desktop accessibility */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
            aria-label={t("aria_edit")}
            title={t("aria_edit")}
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: "var(--accent-red)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
            aria-label={t("aria_delete")}
            title={t("aria_delete")}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("task_progress", { completed: completedCount, total: taskCount })}
          </span>
          <span
            className="text-xs font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: progressPercent === 100 ? "var(--accent-green)" : "var(--text-muted)",
            }}
          >
            {progressPercent}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              backgroundColor:
                progressPercent === 100
                  ? "var(--accent-green)"
                  : accentColor,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {/* Priority + sequential badges */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              ...priorityStyle,
            }}
          >
            {priorityLabel}
          </span>
          {sequential && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: accentColor,
                backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
              }}
              title={t("form_sequential_hint")}
            >
              <FontAwesomeIcon
                icon={faListOl}
                style={{ width: "0.7rem", height: "0.7rem" }}
              />
              {t("sequential_badge")}
            </span>
          )}
        </div>

        {/* View link */}
        <Link
          href={`/topics/${id}`}
          className="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors no-underline"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: accentColor,
            border: `1px solid ${accentColor}44`,
          }}
        >
          {t("view")}
        </Link>
      </div>
    </div>
  );
}
