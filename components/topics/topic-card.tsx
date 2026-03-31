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

interface TopicCardProps {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  taskCount: number;
  completedCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_CONFIG = {
  HIGH: {
    label: "High",
    style: { color: "var(--accent-red)", backgroundColor: "rgba(184,84,80,0.12)" },
  },
  NORMAL: {
    label: "Normal",
    style: {
      color: "var(--accent-amber)",
      backgroundColor: "rgba(240,165,0,0.12)",
    },
  },
  SOMEDAY: {
    label: "Someday",
    style: {
      color: "var(--text-muted)",
      backgroundColor: "rgba(122,144,127,0.12)",
    },
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
  taskCount,
  completedCount,
  onEdit,
  onDelete,
}: TopicCardProps) {
  const progressPercent =
    taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
  const priorityCfg = PRIORITY_CONFIG[priority];
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
      <div className="flex items-start gap-3">
        {/* Icon/Color circle */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{
            backgroundColor: color ? `${color}22` : "var(--bg-elevated)",
            border: `2px solid ${accentColor}44`,
          }}
          aria-hidden="true"
        >
          {icon ?? "📁"}
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-semibold truncate"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
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

        {/* Action buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onEdit(id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Edit topic"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(id)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Delete topic"
            title="Delete"
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
            {completedCount}/{taskCount} tasks
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
      <div className="flex items-center justify-between">
        {/* Priority badge */}
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            ...priorityCfg.style,
          }}
        >
          {priorityCfg.label}
        </span>

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
          View →
        </Link>
      </div>
    </div>
  );
}
