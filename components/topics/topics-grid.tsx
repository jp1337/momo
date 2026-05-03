"use client";

/**
 * TopicsGrid component — interactive grid of topic cards.
 *
 * Manages topic state after initial server-fetched data.
 * Handles create/edit/delete/archive actions.
 *
 * "New Topic" button opens TemplatePicker (with template cards + blank start).
 * Archived topics are shown in a collapsed section at the bottom.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faBoxArchive, faXmark } from "@fortawesome/free-solid-svg-icons";
import { TopicCard } from "./topic-card";
import { TopicForm } from "./topic-form";
import { TemplatePicker } from "./template-picker";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  defaultEnergyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  sequential: boolean;
  archived: boolean;
  taskCount: number;
  completedCount: number;
}

interface TopicsGridProps {
  initialTopics: Topic[];
}

/**
 * Empty state for when the user has no active topics.
 */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations("topics");
  return (
    <div
      className="relative rounded-2xl p-12 sm:p-16 text-center overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px dashed var(--border)",
      }}
    >
      {/* Soft green halo behind the icon — same atmospheric pattern as tasks/wishlist */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent-green) 14%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <p className="relative text-6xl mb-5 select-none" role="img" aria-label="Folder">
        📂
      </p>
      <p
        className="relative text-xl font-semibold mb-2"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          fontStyle: "italic",
          color: "var(--text-primary)",
        }}
      >
        {t("page_subtitle_empty")}
      </p>
      <p
        className="relative text-sm max-w-sm mx-auto mb-6"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        {t("empty_hint")}
      </p>
      <button
        onClick={onAdd}
        className="relative px-5 py-2.5 rounded-lg text-sm font-semibold transition-transform duration-150 hover:scale-105"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          backgroundColor: "var(--accent-amber)",
          color: "var(--bg-primary)",
        }}
      >
        {t("create_first")}
      </button>
    </div>
  );
}

/**
 * Interactive grid of topic cards with CRUD + archive functionality.
 */
export function TopicsGrid({ initialTopics }: TopicsGridProps) {
  const t = useTranslations("topics");
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const editingTopic = topics.find((topic) => topic.id === editingTopicId);

  const activeTopics = topics.filter((t) => !t.archived);
  const archivedTopics = topics.filter((t) => t.archived);

  const refreshTopics = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/topics"),
        fetch("/api/topics?archived=true"),
      ]);
      if (activeRes.ok && archivedRes.ok) {
        const [activeData, archivedData] = await Promise.all([
          activeRes.json() as Promise<{ topics: Topic[] }>,
          archivedRes.json() as Promise<{ topics: Topic[] }>,
        ]);
        setTopics([...activeData.topics, ...archivedData.topics.map((t) => ({ ...t, archived: true }))]);
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/topics/${id}`, { method: "DELETE" });
        if (res.ok) {
          setTopics((prev) => prev.filter((topic) => topic.id !== id));
        }
      } catch {
        // silent fail
      }
    },
    []
  );

  const handleArchive = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) {
        setTopics((prev) =>
          prev.map((topic) => (topic.id === id ? { ...topic, archived: true } : topic))
        );
        setArchivedExpanded(true);
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleUnarchive = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (res.ok) {
        setTopics((prev) =>
          prev.map((topic) => (topic.id === id ? { ...topic, archived: false } : topic))
        );
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleFormSuccess = useCallback(async () => {
    setEditingTopicId(null);
    setShowCreateForm(false);
    await refreshTopics();
  }, [refreshTopics]);

  return (
    <div>
      {/* New Topic button (opens template picker) */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowTemplatePicker(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          {t("new_topic")}
        </button>
      </div>

      {/* Empty state */}
      {activeTopics.length === 0 && archivedTopics.length === 0 && (
        <EmptyState onAdd={() => setShowTemplatePicker(true)} />
      )}

      {/* Active topics grid — staggered fade-up on initial mount */}
      {activeTopics.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeTopics.map((topic, idx) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                ease: "easeOut",
                // 40ms stagger feels choreographed without dragging out the load.
                // Cap the delay at 12 cards so very long lists never feel slow.
                delay: Math.min(idx, 12) * 0.04,
              }}
            >
              <TopicCard
                id={topic.id}
                title={topic.title}
                description={topic.description}
                color={topic.color}
                icon={topic.icon}
                priority={topic.priority}
                sequential={topic.sequential}
                taskCount={topic.taskCount}
                completedCount={topic.completedCount}
                onEdit={setEditingTopicId}
                onDelete={handleDelete}
                onArchive={handleArchive}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Archived topics section */}
      {archivedTopics.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setArchivedExpanded((v) => !v)}
            className="flex items-center gap-2 mb-4 text-sm font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <FontAwesomeIcon
              icon={archivedExpanded ? faChevronDown : faChevronRight}
              style={{ fontSize: 11 }}
            />
            <FontAwesomeIcon icon={faBoxArchive} style={{ fontSize: 13 }} />
            {t("archived_section", { count: archivedTopics.length })}
          </button>

          {archivedExpanded && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedTopics.map((topic) => (
                <ArchivedTopicCard
                  key={topic.id}
                  id={topic.id}
                  title={topic.title}
                  color={topic.color}
                  icon={topic.icon}
                  taskCount={topic.taskCount}
                  completedCount={topic.completedCount}
                  onUnarchive={handleUnarchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template picker modal */}
      {showTemplatePicker && (
        <TemplatePicker
          onImported={async () => {
            setShowTemplatePicker(false);
            await refreshTopics();
          }}
          onStartBlank={() => {
            setShowTemplatePicker(false);
            setShowCreateForm(true);
          }}
          onCancel={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Topic form modal (create or edit) */}
      {(showCreateForm || editingTopicId) && (
        <TopicForm
          initialData={
            editingTopic
              ? {
                  id: editingTopic.id,
                  title: editingTopic.title,
                  description: editingTopic.description ?? "",
                  color: editingTopic.color ?? "#4a8c5c",
                  icon: editingTopic.icon ?? "📁",
                  priority: editingTopic.priority,
                  defaultEnergyLevel: editingTopic.defaultEnergyLevel ?? null,
                  sequential: editingTopic.sequential,
                }
              : undefined
          }
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingTopicId(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Archived Topic Card ───────────────────────────────────────────────────────

interface ArchivedTopicCardProps {
  id: string;
  title: string;
  color?: string | null;
  icon?: string | null;
  taskCount: number;
  completedCount: number;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

import { resolveTopicIcon } from "@/lib/topic-icons";

/**
 * Compact card for an archived topic — shows title, progress and restore/delete actions.
 */
function ArchivedTopicCard({
  id,
  title,
  color,
  icon,
  taskCount,
  completedCount,
  onUnarchive,
  onDelete,
}: ArchivedTopicCardProps) {
  const t = useTranslations("topics");
  const accentColor = color ?? "var(--text-muted)";
  const progressPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        opacity: 0.75,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: color ? `${color}18` : "var(--bg-elevated)",
          border: `2px solid ${accentColor}33`,
        }}
        aria-hidden
      >
        <FontAwesomeIcon
          icon={resolveTopicIcon(icon)}
          style={{ width: "1rem", height: "1rem", color: accentColor }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            color: "var(--text-muted)",
          }}
        >
          {title}
        </p>
        <p
          className="text-xs"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("task_progress", { completed: completedCount, total: taskCount })} · {progressPercent}%
        </p>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onUnarchive(id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {t("unarchive_btn")}
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("aria_unarchive")}</TooltipContent>
        </Tooltip>
        <ConfirmButton
          onConfirm={() => onDelete(id)}
          confirmPrompt={t("confirm_delete")}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--accent-red)" }}
          aria-label={t("aria_delete")}
        >
          <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} />
        </ConfirmButton>
      </div>
    </div>
  );
}
