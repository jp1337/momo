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
 * **Der Wortumbruch-Fehler, der hier behoben wird — und warum die erste
 * Erklärung dafür falsch war (Task-10-Review C1):** die vorherige Karte
 * setzte auf dem `<h3>`-Titel `overflowWrap: "break-word"` UND
 * `wordBreak: "break-word"` gleichzeitig und brach mitten im Wort
 * ("Steuererklärun g 2025"). `Row`s Titel-Span trägt `min-width: 0`, und
 * das neutralisiert den einzigen Unterschied zwischen `break-word` und
 * `anywhere` — `overflow-wrap: break-word` allein
 * reproduziert den gemeldeten Fehler zeichengenau, mit oder ohne
 * `word-break` daneben. Der tatsächliche Fix ist `hyphens-auto`: es bricht
 * an einer echten Silbengrenze statt mitten im Wort, weil `app/layout.tsx`
 * `<html lang={locale}>` setzt. `Row`s `wrapTitle`-Prop setzt beides,
 * `break-words hyphens-auto` — dieselbe Logik gilt für jede Zeile mit
 * `wrapTitle`, nicht nur für Themen. Die kanonische Erklärung des Mechanismus
 * steht in `components/ui/list.tsx` bei `wrapTitle`, und das tatsächliche
 * Bruchverhalten wird durch die ausführbare Assertion „ein langer Themenname
 * bricht nicht mitten im Wort" in `e2e/topics.spec.ts` geprüft.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faPen, faXmark } from "@fortawesome/free-solid-svg-icons";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ACTION_BTN, Row } from "@/components/ui/list";

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
      // Sichtbar bleibt das kompakte "3/7" (Mono, Brief-Vorgabe) — die
      // aria-label trägt den vollen Satz, sonst hört ein Screenreader nur
      // zwei nackte Ziffern ohne Nomen (Task-10-Review I5).
      trailing={
        <span aria-label={t("task_progress", { completed: completedCount, total: taskCount })}>
          {`${completedCount}/${taskCount}`}
        </span>
      }
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
            title={t("aria_delete")}
          >
            <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" aria-hidden="true" />
          </ConfirmButton>
        </span>
      }
    />
  );
}
