/**
 * Topics list page — Lichtkegel-Layout (Task 10).
 *
 * Server component that fetches topics for the current user with task
 * counts, then renders them through `PageFrame`: die Zähler (Anzahl
 * Themen, Anzahl offener Aufgaben) stehen im Rand, nicht als Untertitel im
 * Inhalt — sie sagen etwas ÜBER den Tag, nicht was der Nutzer TUT (siehe
 * `PageFrame`s JSDoc). `max-w-5xl` entfällt: das Maß kommt jetzt von
 * `PageFrame` (`--measure`).
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserTopics, getArchivedTopics } from "@/lib/topics";
import { TopicsGrid } from "@/components/topics/topics-grid";
import { PageFrame } from "@/components/ui/page-frame";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Topics",
};

/**
 * Topics list page.
 * Fetches all topics with task counts for the authenticated user.
 */
export default async function TopicsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("topics");

  const [topics, archivedTopics] = await Promise.all([
    getUserTopics(session.user.id),
    getArchivedTopics(session.user.id),
  ]);

  const serializeTopic = (topic: typeof topics[0], archived: boolean) => ({
    id: topic.id,
    title: topic.title,
    description: topic.description ?? null,
    color: topic.color ?? null,
    icon: topic.icon ?? null,
    priority: topic.priority,
    defaultEnergyLevel: topic.defaultEnergyLevel ?? null,
    sequential: topic.sequential,
    archived,
    taskCount: topic.taskCount,
    completedCount: topic.completedCount,
  });

  const serializedTopics = [
    ...topics.map((t) => serializeTopic(t, false)),
    ...archivedTopics.map((t) => serializeTopic(t, true)),
  ];

  // Offene Aufgaben nur über die AKTIVEN Themen — ein archiviertes Thema
  // trägt keine offene Arbeit mehr im Sinn des Rands ("offen" über bereits
  // archivierte Themen mitzuzählen wäre keine Null, sondern eine falsche
  // Tatsache). Der Zähler wird bei 0 ausgeblendet — anders als /tasks'
  // `rail_open` (der IMMER steht, auch bei 0; nur `rail_overdue` ist dort
  // gated, siehe `tasks-rail.tsx`). Kein Präzedenzfall, eine eigene
  // Entscheidung: "0 offene Aufgaben über alle Themen" ist der Normalfall,
  // sobald man mit allen Themen durch ist, keine Ausnahme, die den Rand
  // wert wäre (Task-10-Review, Minor: der vorherige Kommentar berief sich
  // fälschlich auf `rail_overdue` als Präzedenz).
  const openTasks = topics.reduce(
    (sum, topic) => sum + (topic.taskCount - topic.completedCount),
    0,
  );

  return (
    <PageFrame
      rail={
        <>
          <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
            {t("page_subtitle", { count: topics.length })}
          </p>
          {openTasks > 0 && (
            <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
              {t("rail_open_tasks", { count: openTasks })}
            </p>
          )}
        </>
      }
    >
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
        {t("page_title")}
      </h1>

      <TopicsGrid initialTopics={serializedTopics} />
    </PageFrame>
  );
}
