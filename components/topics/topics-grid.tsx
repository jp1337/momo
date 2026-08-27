"use client";

/**
 * TopicsGrid component — interactive list of topic rows.
 *
 * Manages topic state after initial server-fetched data.
 * Handles create/edit/delete/archive actions.
 *
 * "New Topic" button opens TemplatePicker (with template cards + blank start).
 * Archived topics are shown in a collapsed section at the bottom.
 *
 * Vormals ein 1/2/3-Spalten-Raster für eine einzelne Karte (27
 * Ratschen-Verstöße) — jetzt zwei `List`s (aktiv, archiviert), je aus
 * `Row`-Zeilen (`TopicCard`/`ArchivedTopicCard`) zusammengesetzt. Eine
 * `List` pro Gruppe (siehe `components/ui/list.tsx`s JSDoc) — die
 * Archiv-Umschalttaste ist eine Aufklapp-Affordanz, keine `GroupHeading`,
 * und steht deshalb weiterhin als eigener `<button>` vor der `List`.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faBoxArchive, faRotateLeft, faXmark } from "@fortawesome/free-solid-svg-icons";
import { TopicCard, ACTION_BTN } from "./topic-card";
import { TopicForm } from "./topic-form";
import { TemplatePicker } from "./template-picker";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Button } from "@/components/ui/button";
import { List, Row } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";

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
 * Interactive list of topic rows with CRUD + archive functionality.
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
    <div className="flex flex-col gap-8">
      {/* New Topic button (opens template picker) */}
      <div className="flex justify-end">
        <Button type="button" variant="primary" size="sm" onClick={() => setShowTemplatePicker(true)}>
          {t("new_topic")}
        </Button>
      </div>

      {/* Empty state */}
      {activeTopics.length === 0 && archivedTopics.length === 0 && (
        <EmptyState
          line={t("empty_hint")}
          action={
            <Button type="button" variant="quiet" size="md" onClick={() => setShowTemplatePicker(true)}>
              {t("create_first")}
            </Button>
          }
        />
      )}

      {/* Active topics */}
      {activeTopics.length > 0 && (
        <List>
          {activeTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              id={topic.id}
              title={topic.title}
              color={topic.color}
              taskCount={topic.taskCount}
              completedCount={topic.completedCount}
              onEdit={setEditingTopicId}
              onDelete={handleDelete}
              onArchive={handleArchive}
            />
          ))}
        </List>
      )}

      {/* Archived topics section */}
      {archivedTopics.length > 0 && (
        <div>
          <button
            onClick={() => setArchivedExpanded((v) => !v)}
            className="mb-3 flex items-center gap-2 border-0 bg-transparent p-0 font-[family-name:var(--font-mono)] text-[0.6875rem] font-normal uppercase tracking-[0.16em] text-[var(--ink-3)]"
          >
            <FontAwesomeIcon
              icon={archivedExpanded ? faChevronDown : faChevronRight}
              className="h-2.5 w-2.5"
              aria-hidden="true"
            />
            <FontAwesomeIcon icon={faBoxArchive} className="h-3 w-3" aria-hidden="true" />
            {t("archived_section", { count: archivedTopics.length })}
          </button>

          {archivedExpanded && (
            <List>
              {archivedTopics.map((topic) => (
                <ArchivedTopicCard
                  key={topic.id}
                  id={topic.id}
                  title={topic.title}
                  color={topic.color}
                  taskCount={topic.taskCount}
                  completedCount={topic.completedCount}
                  onUnarchive={handleUnarchive}
                  onDelete={handleDelete}
                />
              ))}
            </List>
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

// ─── Archived Topic Row ─────────────────────────────────────────────────────

interface ArchivedTopicCardProps {
  id: string;
  title: string;
  color?: string | null;
  taskCount: number;
  completedCount: number;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Zeile für ein archiviertes Thema — `truncate` statt `wrapTitle` (bewusst,
 * Task 10 Brief): die aktive Liste braucht den vollen Namen, die
 * archivierte ist eine kompakte Nebenansicht, `tone="secondary"` gedämpft.
 *
 * @param props - siehe ArchivedTopicCardProps
 * @returns Eine `Row` mit Wiederherstellen- und Löschen-Aktion
 */
function ArchivedTopicCard({
  id,
  title,
  color,
  taskCount,
  completedCount,
  onUnarchive,
  onDelete,
}: ArchivedTopicCardProps) {
  const t = useTranslations("topics");

  return (
    <Row
      testId="topic-row"
      tone="secondary"
      title={title}
      trailing={`${completedCount}/${taskCount}`}
      dotColor={color ?? null}
      actions={
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUnarchive(id)}
            className={ACTION_BTN}
            aria-label={t("aria_unarchive")}
            title={t("unarchive_btn")}
          >
            <FontAwesomeIcon icon={faRotateLeft} className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <ConfirmButton
            onConfirm={() => onDelete(id)}
            confirmPrompt={t("confirm_delete")}
            className={ACTION_BTN}
            aria-label={t("aria_delete")}
          >
            <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" aria-hidden="true" />
          </ConfirmButton>
        </span>
      }
    />
  );
}
