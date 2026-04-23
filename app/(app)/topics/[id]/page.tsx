/**
 * Topic detail page — Phase 2.
 *
 * Shows the topic header (title, description, color, progress bar)
 * and all subtasks within this topic.
 * Provides an "Add subtask" button and back navigation.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTopicById } from "@/lib/topics";
import { TopicDetailView } from "@/components/topics/topic-detail-view";
import { TopicDetailActions } from "@/components/topics/topic-detail-actions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { resolveTopicIcon } from "@/lib/topic-icons";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Topic — Momo",
};

interface TopicDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Topic detail page.
 * Fetches the topic with its tasks for the authenticated user.
 */
export default async function TopicDetailPage({ params }: TopicDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const [topic, t] = await Promise.all([
    getTopicById(id, session.user.id),
    getTranslations("topics"),
  ]);

  if (!topic) {
    notFound();
  }

  const serializedTasks = topic.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    dueDate: t.dueDate ?? null,
    nextDueDate: t.nextDueDate ?? null,
    topicId: t.topicId ?? null,
    notes: t.notes ?? null,
    coinValue: t.coinValue,
    createdAt: t.createdAt.toISOString(),
    recurrenceInterval: t.recurrenceInterval ?? null,
    estimatedMinutes: t.estimatedMinutes ?? null,
    snoozedUntil: t.snoozedUntil ?? null,
    sortOrder: t.sortOrder ?? 0,
    taskGroup: t.taskGroup ?? null,
  }));

  const accentColor = topic.color ?? "var(--accent-amber)";
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/topics"
        className="inline-flex items-center gap-1.5 text-sm mb-6 no-underline transition-colors"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {t("back_to_topics")}
      </Link>

      {/* Topic header */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        {/* Title row */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              backgroundColor: topic.color ? `${topic.color}22` : "var(--bg-elevated)",
            }}
            aria-hidden="true"
          >
            <FontAwesomeIcon
              icon={resolveTopicIcon(topic.icon)}
              style={{
                width: "1.1rem",
                height: "1.1rem",
                color: topic.color ?? "var(--accent-amber)",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-semibold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--text-primary)",
              }}
            >
              {topic.title}
            </h1>
            {topic.description && (
              <p
                className="text-sm mt-0.5"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {topic.description}
              </p>
            )}
          </div>
          <TopicDetailActions
            topic={{
              id: topic.id,
              title: topic.title,
              description: topic.description ?? null,
              color: topic.color ?? null,
              icon: topic.icon ?? null,
              priority: topic.priority,
            }}
          />
        </div>
      </div>

      {/* Task list for this topic */}
      <TopicDetailView
        topicId={id}
        topicTitle={topic.title}
        initialTasks={serializedTasks}
        topicColor={topic.color ?? null}
        topicDefaultEnergyLevel={topic.defaultEnergyLevel ?? null}
        topicSequential={topic.sequential}
      />
    </div>
  );
}
