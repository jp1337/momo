import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * List und Row — die eine Zeile für die ganze App.
 *
 * Ersetzt fünf getrennte Implementierungen (task-item, task-list,
 * focus-mode-view, wishlist-card, topic-card). Haarlinie trennt, kein
 * Kasten umrahmt.
 *
 * **Die Zeile ist nichts als Text.** Jede Metadatenart bekommt eine
 * Kodierung, die keine Fläche braucht:
 *
 * | Feld | Kodierung |
 * |---|---|
 * | Dauer | die Schriftgröße des Titels (`effort`), plus die Minutenzahl in `trailing` |
 * | Priorität | Gruppenüberschrift (`GroupHeading`), kein Abzeichen an der Zeile |
 * | Thema | Mono-Eyebrow unter dem Titel (`eyebrow`) |
 * | Themenfarbe | ein 6-px-Punkt (`dotColor`) |
 * | Fälligkeit | rechts, Mono (`trailing`); `--danger` nur bei Überfälligkeit |
 *
 * Warum keine Chips: die Spec verlangt, dass eine Fläche beantworten kann,
 * welche Frage sie dem Nutzer stellt. Ein Chip um "60 min" ist eine Fläche
 * ohne Affordanz — man kann ihn nicht drücken. Er fällt damit unter
 * dieselbe Regel wie der abgeschaffte Card.
 *
 * Warum die Größe nicht die einzige Kodierung der Dauer ist: WCAG 1.4.1
 * (Verwendung von Farbe bzw. sensorischen Merkmalen). Die Minutenzahl
 * steht als Text daneben.
 */
export type EffortStep = "small" | "medium" | "large";

/**
 * Ordnet eine geschätzte Dauer einer der drei Aufwandsstufen zu. Die Stufe
 * bestimmt die Schriftgröße der Zeile: der Aufwand ist sichtbar, bevor man
 * liest.
 *
 * Drei diskrete Stufen, nicht stufenlos — stufenlos kollidiert mit
 * Mindestgrößen und Browser-Zoom.
 *
 * `estimatedMinutes` ist ein Enum, kein freier Integer: `5 | 15 | 30 | 60 |
 * null` (siehe `lib/validators/index.ts`).
 *
 * @param minutes - Geschätzte Dauer (5, 15, 30, 60) oder null
 * @returns "small" (≤5 min), "medium" (≤30 min oder ohne Schätzung), "large" (>30 min)
 */
export function effortStep(minutes: number | null): EffortStep {
  if (minutes === null) return "medium";
  if (minutes <= 5) return "small";
  if (minutes <= 30) return "medium";
  return "large";
}

/** Schriftgröße je Aufwandsstufe — nie unter 0.875rem, damit Zoom greift. */
export const EFFORT_TEXT: Record<EffortStep, string> = {
  small: "text-[0.875rem]",
  medium: "text-[1rem]",
  large: "text-[1.25rem]",
};

/**
 * Die Liste: keine Aufzählungspunkte, kein Rahmen, kein Abstand außen.
 *
 * @param props.children - die `Row`- (oder `GroupHeading`-) Kinder
 * @param props.className - zusätzliche Klassen
 * @returns Ein `<ul>` ohne Standard-Listenstil
 */
export function List({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ul className={cn("m-0 list-none p-0", className)}>{children}</ul>;
}

/**
 * Gruppenüberschrift innerhalb einer Liste — ein Mono-Eyebrow.
 *
 * Priorität als Gruppierung statt als Abzeichen ist Struktur statt
 * Dekoration: "HOCH · 2" kodiert etwas Wahres über den Inhalt, ein
 * amberfarbenes Abzeichen an jeder Zeile behauptet nur Wichtigkeit.
 *
 * @param props.children - der Überschriftentext, z. B. "Hoch · 3"
 * @returns Ein `<p>` als Mono-Eyebrow
 */
export function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mt-8 mb-3 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)] first:mt-0">
      {children}
    </p>
  );
}

export interface RowProps {
  /** Links: Abhak-Kreis, Auswahlkästchen, Griff. */
  lead?: React.ReactNode;
  /** Der Titel. Trägt die Aufwandsgröße. */
  title: React.ReactNode;
  /** Mono-Eyebrow unter dem Titel — das Thema, `--ink-3`. */
  eyebrow?: React.ReactNode;
  /** Rechts, Mono: Fälligkeit, Minutenzahl, Summe. */
  trailing?: React.ReactNode;
  /** Aktionen, sichtbar bei Hover und Fokus. */
  actions?: React.ReactNode;
  /** Aufwandsstufe; bestimmt die Titelgröße. Standard: medium. */
  effort?: EffortStep;
  /** Die frei gewählte Themenfarbe des Nutzers, als 6-px-Punkt. */
  dotColor?: string | null;
  /** Erledigt: gedämpft und durchgestrichen. */
  dimmed?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Eine Zeile. Haarlinie oben, außer bei der ersten.
 *
 * @param props - siehe RowProps
 * @returns Ein `<li>` ohne Fläche und ohne Rahmen
 */
export function Row({
  lead,
  title,
  eyebrow,
  trailing,
  actions,
  effort = "medium",
  dotColor,
  dimmed = false,
  className,
  testId = "row",
}: RowProps) {
  return (
    <li
      data-testid={testId}
      data-effort={effort}
      className={cn(
        "group flex items-start gap-3 border-t border-t-[var(--hairline)] bg-transparent py-3 first:border-t-0",
        className,
      )}
    >
      {lead ? <span className="mt-1 shrink-0">{lead}</span> : null}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          {dotColor ? (
            <span
              data-testid="row-dot"
              aria-hidden="true"
              className="h-[6px] w-[6px] shrink-0 rounded-[var(--radius-pill)]"
              // Die EINZIGE verbleibende Öffnung für eine frei gewählte
              // Nutzerfarbe (Spec §5). Ein Inline-Style ist hier
              // unvermeidlich: der Wert kommt aus der Datenbank, kein
              // Token kann ihn abbilden. Bewusst als --admit in der
              // Ratsche geführt statt als stiller Rückschritt.
              style={{ backgroundColor: dotColor }}
            />
          ) : null}
          <span
            data-row-title
            className={cn(
              "min-w-0 flex-1 truncate font-[family-name:var(--font-mono)]",
              EFFORT_TEXT[effort],
              dimmed ? "text-[var(--ink-3)] line-through" : "text-[var(--ink)]",
            )}
          >
            {title}
          </span>
        </span>
        {eyebrow ? (
          <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {eyebrow}
          </span>
        ) : null}
      </span>

      {trailing ? (
        <span className="shrink-0 self-center font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
          {trailing}
        </span>
      ) : null}

      {actions ? (
        <span className="shrink-0 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </span>
      ) : null}
    </li>
  );
}
