/**
 * Progress — eine Route, vier Zustände (habits · achievements · review · stats).
 *
 * Die Seite kennt nur: wer ist angemeldet, welcher Tab ist gewählt, und wie
 * sieht die gemeinsame Kopfzeile aus. Alles andere — Datenbeschaffung,
 * Lesespalte, Rand — gehört dem jeweiligen Tab (`components/progress/tabs/`).
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { ProgressTabs, VALID_TABS } from "@/components/progress/progress-tabs";
import type { Tab } from "@/components/progress/progress-tabs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

/**
 * Rendert den gewählten Tab von /progress.
 *
 * @param props.searchParams - `?tab=` (ungültig ⇒ `habits`) und `?year=`
 * @returns Den Tab-Inhalt, oder eine Weiterleitung nach /login
 */
export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("progress");
  const params = await searchParams;
  const tab: Tab = VALID_TABS.includes(params.tab as Tab)
    ? (params.tab as Tab)
    : "habits";

  // Die eine Fraunces-Überschrift der Seite plus die Tab-Leiste, in einem
  // eigenen Flex-Block gruppiert (nicht zwei lose PageFrame-Kinder), damit
  // der 16px-Abstand zwischen Titel und Tabs vom 32px-Rhythmus des Rahmens
  // unberührt bleibt.
  const header = (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
        {t("page_title")}
      </h1>
      <nav className="flex gap-1" aria-label={t("page_title")}>
        {VALID_TABS.map((key) => {
          const isActive = tab === key;
          return (
            <Link
              key={key}
              href={`/progress?tab=${key}`}
              className={cn(
                "rounded-[var(--radius-sm)] px-4 py-2 font-[family-name:var(--font-ui)] text-[0.85rem] no-underline! transition-colors",
                isActive
                  ? "bg-[var(--raised)] font-semibold text-[var(--ink)]!"
                  : "bg-transparent font-medium text-[var(--ink-3)]! hover:text-[var(--ink-2)]!",
              )}
            >
              {t(`tab_${key}` as "tab_habits" | "tab_achievements" | "tab_review")}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <ProgressTabs
      tab={tab}
      userId={session.user.id}
      header={header}
      yearParam={params.year}
    />
  );
}
