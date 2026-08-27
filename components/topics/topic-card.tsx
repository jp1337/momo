"use client";

/**
 * TopicCard — ein Thema als Zeile.
 *
 * Ersetzt die vorherige Karte (Icon-Kreis, Prioritäts-Badge, Beschreibung,
 * Fortschrittsbalken, "sequenziell"-Badge, "alles erledigt"-Banner — 28
 * Ratschen-Verstöße) durch `Row` (`components/ui/list.tsx`): der Titel
 * trägt den vollen Namen (`wrapTitle`), der Fortschritt ("3/7") steht
 * rechts in Mono, die Themenfarbe ist der 6-px-Punkt (`dotColor`).
 * Priorität, Beschreibung und das sequenziell-Flag bleiben im
 * Bearbeiten-Formular (`TopicForm`) einstellbar — die Liste selbst ist
 * nichts als Text, dieselbe Kodierungslogik wie `TaskRow` (siehe dort für
 * die vollständige Tabelle "vorher → jetzt").
 *
 * Der Titel ist zugleich ein `<Link>` zum Thema-Detail — vorher ein
 * gerahmter "Ansehen →"-Button, jetzt ohne eigene Fläche: der Titel selbst
 * ist bereits die Affordanz, eine zweite Kante daneben wäre überflüssig.
 * Keine eigene `className` auf dem `<Link>`: `globals.css`s `a`-Regel
 * ("Link defaults", 2026-08-22) setzt `color: inherit` und eine
 * haarlinienfarbene Unterstreichung bereits unlayered — sie schlägt jede
 * `@layer utilities`-Klasse unabhängig von Spezifität (dieselbe Falle wie
 * in `button.tsx` dokumentiert), ein `text-inherit no-underline` hier wäre
 * also nicht nur überflüssig, sondern stumm wirkungslos. Die
 * Unterstreichung ist inzwischen ohnehin das site-weite Signal "das ist ein
 * Link" statt Amber (siehe `globals.css` dort) — genau richtig für einen
 * Titel, der zugleich navigiert.
 *
 * **Der Wortumbruch-Fehler, der hier behoben wird:** die vorherige Karte
 * setzte auf dem `<h3>`-Titel `overflowWrap: "break-word"` UND
 * `wordBreak: "break-word"` gleichzeitig. `word-break: break-word` ist der
 * veraltete Alias von `overflow-wrap: anywhere` — er bricht auch innerhalb
 * eines Wortes, das auf die nächste Zeile gepasst hätte ("Steuererklärun
 * g 2025"). `overflow-wrap: break-word` allein bricht nur ein Wort, das für
 * sich allein nicht in die Zeile passt. `Row`s `wrapTitle`-Prop setzt jetzt
 * ausschließlich Tailwinds `break-words` (= `overflow-wrap: break-word`,
 * ohne `word-break`) plus `hyphens-auto` — dieselbe Bugfix-Logik gilt für
 * jede Zeile mit `wrapTitle`, nicht nur für Themen.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Row } from "@/components/ui/list";

interface TopicCardProps {
  id: string;
  title: string;
  color?: string | null;
  taskCount: number;
  completedCount: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

/** Eine Zeilenaktion ohne Fläche — derselbe Stil wie `TaskRowActions`' `ACTION_BTN`; von `topics-grid.tsx`s `ArchivedTopicCard` mitverwendet. */
export const ACTION_BTN =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-0 bg-transparent p-2 text-[var(--ink-3)] transition-colors hover:bg-[var(--raised)]";

/**
 * Eine Themenzeile mit Bearbeiten-, Archivieren- und Löschen-Aktionen.
 *
 * @param props - siehe TopicCardProps
 * @returns Eine `Row` ohne Fläche und ohne Rahmen
 */
export function TopicCard({
  id,
  title,
  color,
  taskCount,
  completedCount,
  onEdit,
  onDelete,
  onArchive,
}: TopicCardProps) {
  const t = useTranslations("topics");

  return (
    <Row
      testId="topic-row"
      wrapTitle
      title={<Link href={`/topics/${id}`}>{title}</Link>}
      trailing={`${completedCount}/${taskCount}`}
      dotColor={color ?? null}
      actions={
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(id)}
            className={ACTION_BTN}
            aria-label={t("aria_edit")}
            title={t("aria_edit")}
          >
            <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onArchive(id)}
            className={ACTION_BTN}
            aria-label={t("aria_archive")}
            title={t("aria_archive")}
          >
            <FontAwesomeIcon icon={faBoxArchive} className="h-3.5 w-3.5" aria-hidden="true" />
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
