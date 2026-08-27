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
 * Die Bühnen-Überschrift — Klammer, Zeilenhöhe, Sperrung, Maximalbreite für
 * das eine Fraunces-Element einer Seite (Dashboard-Quest, `/focus`-Bühne).
 * Ohne Farbe: der Aufrufer hängt sie an (aktiv `--ink`, erledigt
 * `--ink-3` + Durchstreichung) — dieselbe Trennung von Größe und Farbe wie
 * bei `Row`s `tone`-Prop. `font-display-stage` (in `globals.css`) trägt die
 * Variable-Font-Achsen (`fontVariationSettings`): Tailwinds
 * Arbitrary-Value-Syntax kommt mit den Anführungszeichen und Kommas der
 * Achsenliste nicht klar, nur eine benannte Klasse im Stylesheet trägt den
 * Wert; vorher war das ein Inline-Style-Objekt in zwei byte-identischen
 * Kopien (`daily-quest-card.tsx`, `focus-mode-view.tsx`), die vom
 * Ratschen-Regex `/style=\{\{/g` nicht gesehen wurden — hier
 * zusammengeführt (Task-9-Review F2/F4).
 */
export const stageTitleClassName =
  "m-0 max-w-[26ch] font-[family-name:var(--font-display)] font-display-stage font-normal " +
  "text-[clamp(1.75rem,4.1vw,2.85rem)] leading-[1.08] tracking-[-0.022em] text-balance";

/**
 * Die Liste: keine Aufzählungspunkte, kein Rahmen, kein Abstand außen.
 *
 * **Eine `List` pro Gruppe.** Eine `GroupHeading` gehört DANEBEN (als
 * Geschwister davor), nicht HINEIN (Task-4-Review R15): `GroupHeading`
 * rendert ein `<h2>`, `List` ein `<ul>` — eine Überschrift als Kind eines
 * `<ul>` ist ungültiges DOM. Es bricht außerdem die eigene Haarlinien-Regel:
 * die erste `Row` nach einer eingebetteten Überschrift wäre nicht mehr
 * `:first-child`, `first:border-t-0` griffe nicht mehr, und unter der
 * Überschrift erschiene eine Haarlinie. Derselbe Fehler entsteht mit JEDEM
 * Wrapper-Element zwischen `<ul>` und `<li>` — auch ohne Überschrift (Task 8
 * Review, F1: ein `<div>` pro Zeile für ein Positionierungs-Detail hat
 * genau das auf `/tasks`' "Nach Thema"-Ansicht getan). Eine Seite mit
 * mehreren Prioritätsgruppen (z. B. `/tasks`) rendert entsprechend mehrere
 * `<ul>`s, je mit einer `GroupHeading` davor.
 *
 * @param props.children - `Row`-Kinder
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
 * Gruppenüberschrift — ein Mono-Eyebrow. Steht als Geschwister VOR einer
 * eigenen `List`, nie als deren Kind (siehe `List`-JSDoc).
 *
 * Priorität als Gruppierung statt als Abzeichen ist Struktur statt
 * Dekoration: "HOCH · 2" kodiert etwas Wahres über den Inhalt, ein
 * amberfarbenes Abzeichen an jeder Zeile behauptet nur Wichtigkeit.
 *
 * Rendert als `<h2>`, nicht `<p>` (Task 8, /tasks-Migration): eine
 * Gruppenüberschrift IST eine Überschrift, und `e2e/tasks.spec.ts`
 * ("tasks are grouped by priority/due date sections") verlangt bereits ein
 * `h2`/`h3` auf der Seite. `GroupHeading` hatte vor Task 8 noch keinen
 * echten Aufrufer außer der Referenzseite `/design-system` — die
 * Tag-Änderung ändert dort nichts Sichtbares (die Klassen setzen Marge und
 * Typografie bereits explizit) und macht die Komponente nebenbei
 * semantisch korrekter.
 *
 * `!` auf Schriftart UND Farbe: `globals.css` setzt für `h1` bis `h6` eine
 * Fraunces-Schriftfamilie und `color: var(--text-primary)`, ungelayert —
 * ein ungelayerter Selektor schlägt jede `@layer utilities`-Klasse
 * unabhängig von Spezifität (dieselbe Falle wie in `button.tsx`
 * dokumentiert). Ohne `!` würde jede `GroupHeading` als `h2` in Fraunces
 * UND in voller `--ink`-Stärke rendern statt als leiser Mono-Eyebrow —
 * genau das hat `design-rules.spec.ts` ("trägt Fraunces genau einmal") auf
 * `/tasks` aufgedeckt.
 *
 * @param props.children - der Überschriftentext, z. B. "Hoch · 3"
 * @returns Ein `<h2>` als Mono-Eyebrow
 */
export function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0 mt-8 mb-3 font-[family-name:var(--font-mono)]! text-[0.6875rem] font-normal uppercase tracking-[0.16em] text-[var(--ink-3)]! first:mt-0">
      {children}
    </h2>
  );
}

/**
 * Eine Zeilenaktion ohne Fläche — der eine Stil für jeden Icon-Button in
 * einem `Row`s `actions`-Slot. Vorher byte-identisch dreimal kopiert
 * (`topic-card.tsx`, `task-row-actions.tsx`, dazu die exportierte Kopie, die
 * `topics-grid.tsx`s `ArchivedTopicCard` importierte) mit einem JSDoc-Satz,
 * der behauptete, zwei der Kopien seien "derselbe Stil" — eine Behauptung,
 * die nichts prüfte und beim nächsten Edit an einer Stelle lautlos falsch
 * geworden wäre (Task-10-Review I4). Hier an der einen Stelle, an der
 * `Row`s `actions`-Vertrag ohnehin lebt.
 */
export const ACTION_BTN =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-0 bg-transparent p-2 text-[var(--ink-3)] transition-colors hover:bg-[var(--raised)]";

/** Props, die `Row` selbst konsumiert — unabhängig davon, als welches Element sie rendert. */
interface RowOwnProps {
  /** Links: Abhak-Kreis, Auswahlkästchen, Griff. Auf derselben Zeile wie Titel/Trailing zentriert. */
  lead?: React.ReactNode;
  /** Der Titel. Trägt die Aufwandsgröße. */
  title: React.ReactNode;
  /** Mono-Eyebrow unter dem Titel — das Thema, `--ink-3`. */
  eyebrow?: React.ReactNode;
  /** Rechts, Mono: Fälligkeit, Minutenzahl, Summe — auf derselben Zeile wie der Titel, nicht über die ganze (ggf. zweizeilige) Zeile zentriert. */
  trailing?: React.ReactNode;
  /**
   * Aktionen. Auf Geräten mit Zeigegerät erst bei Hover/Fokus sichtbar; wo
   * kein Zeigegerät existiert (Touch), immer sichtbar — sonst wären sie
   * dauerhaft unsichtbar, aber wegen Hit-Testing trotzdem antippbar
   * (Task-4-Review, Important 5).
   */
  actions?: React.ReactNode;
  /**
   * Aufwandsstufe; bestimmt die Titelgröße. Ohne Wert wird optisch
   * "medium" verwendet, aber `data-effort` bleibt weg (Task-4-Review R16):
   * eine Zeile ohne Dauer (Thema, Habit) soll keinen Aufwand behaupten,
   * den sie nicht hat.
   */
  effort?: EffortStep;
  /** Die frei gewählte Themenfarbe des Nutzers, als 6-px-Punkt. */
  dotColor?: string | null;
  /** Erledigt: gedämpft und durchgestrichen. Unabhängig von `tone`. */
  dimmed?: boolean;
  /**
   * Titelfarbe, wenn nicht `dimmed` (Task-4-Review R14): `"primary"`
   * (`--ink`, Standard) für eine Zeile, die selbst der Inhalt der Seite
   * ist (`/tasks`); `"secondary"` (`--ink-2`) für eine Zeile, die neben
   * einem wichtigeren Element auf derselben Seite steht (Quick Wins unter
   * der Daily Quest). Orthogonal zu `dimmed` — "erledigt" bleibt
   * ausschließlich `dimmed`s Bedeutung, `--ink-3`+Durchstreichung für eine
   * offene Aufgabe wäre eine Lüge über ihren Status.
   */
  tone?: "primary" | "secondary";
  /**
   * Titel umbrechen statt abschneiden — für Namen, die man ganz lesen muss
   * (Task 10, `/topics`: ein Themenname ist der einzige Weg, das Thema
   * wiederzuerkennen, eine Aufgabenzeile darf dagegen abschneiden). `false`/
   * weggelassen bleibt `truncate`, das bisherige Verhalten jeder anderen
   * Zeile.
   */
  wrapTitle?: boolean;
  className?: string;
  testId?: string;
}

/**
 * `RowProps`, parametrisiert über das Element/die Komponente, als die
 * `Row` rendert (`as`, Standard `"li"`) — Task-4-Review R13. Erlaubt z. B.
 * `as={motion.li}` mit `initial`/`animate`/`exit`/`transition` als
 * zusätzliche Props, ohne `any`: die erlaubten Zusatz-Props sind exakt
 * die, die die Ziel-Komponente `T` selbst deklariert
 * (`React.ComponentPropsWithoutRef<T>`).
 */
export type RowProps<T extends React.ElementType = "li"> = RowOwnProps & {
  /** Render-Ziel; Standard `"li"`. Für die Austritts-Animation: `motion.li`. */
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, keyof RowOwnProps | "as">;

/**
 * Eine Zeile. Haarlinie oben, außer bei der ersten.
 *
 * `Row` besitzt das Zielelement vollständig (Standard `<li>`) und reicht
 * jede unbekannte Prop direkt daran durch — das ist, wie eine
 * Austritts-Animation überhaupt möglich ist (Task-4-Review R13): ein
 * `motion.div` INNERHALB der Zeile kann `AnimatePresence` nicht bedienen,
 * weil `AnimatePresence` genau das Element beobachten muss, das aus dem
 * DOM verschwindet — hier `as={motion.li}` statt eines internen Wrappers.
 *
 * @param props - siehe RowProps
 * @returns Ein Element ohne Fläche und ohne Rahmen
 */
export function Row<T extends React.ElementType = "li">({
  as,
  lead,
  title,
  eyebrow,
  trailing,
  actions,
  effort,
  dotColor,
  dimmed = false,
  tone = "primary",
  wrapTitle = false,
  className,
  testId = "row",
  ...rest
}: RowProps<T>) {
  const Comp = (as ?? "li") as React.ElementType;
  const visualEffort = effort ?? "medium";
  return (
    <Comp
      data-testid={testId}
      {...(effort ? { "data-effort": effort } : {})}
      className={cn(
        "group flex items-start gap-3 border-t border-t-[var(--hairline)] bg-transparent py-3 first:border-t-0",
        className,
      )}
      {...rest}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          {lead ? <span className="shrink-0">{lead}</span> : null}
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
              "min-w-0 flex-1 font-[family-name:var(--font-mono)]",
              // `hyphens-auto` ist der Fix, nicht `break-words` (Task-10-
              // Review C1: die ursprüngliche Begründung war falsch).
              // `overflow-wrap: break-word` allein reproduziert den
              // gemeldeten Fehler zeichengenau. `word-break: break-word` zu
              // entfernen ändert hier NICHTS: `min-width: 0` auf diesem
              // Titel-Span neutralisiert den einzigen echten Unterschied
              // zwischen `break-word` und `anywhere`. `hyphens-auto` ist
              // der Teil, der tatsächlich an einer Silbengrenze statt mitten
              // im Wort bricht; es greift, weil `app/layout.tsx` `<html
              // lang={locale}>` setzt.
              //
              // Das tatsächliche Bruchverhalten wird durch eine
              // ausführbare Assertion geprüft, nicht durch abgeschriebene
              // Beispielwerte: der Test „ein langer Themenname bricht nicht
              // mitten im Wort" in `e2e/topics.spec.ts` erzwingt einen
              // engen Container und überprüft die tatsächlichen Zeilenboxen
              // des Titels. Abgeschriebene Werte können lautlos veralten und
              // zwei vorherige waren falsch; ein Test kann das nicht.
              wrapTitle ? "break-words hyphens-auto" : "truncate",
              EFFORT_TEXT[visualEffort],
              dimmed
                ? "text-[var(--ink-3)] line-through"
                : tone === "secondary"
                  ? "text-[var(--ink-2)]"
                  : "text-[var(--ink)]",
            )}
          >
            {title}
          </span>
          {trailing ? (
            <span className="shrink-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
              {trailing}
            </span>
          ) : null}
        </span>
        {eyebrow ? (
          <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {eyebrow}
          </span>
        ) : null}
      </span>

      {actions ? (
        <span
          className={cn(
            "pointer-events-auto shrink-0 self-center opacity-100 transition-opacity",
            // Nur wo ein Zeigegerät existiert, ist "unsichtbar bis
            // Hover/Fokus" bedienbar (Task-4-Review, Important 5): auf
            // Touch gibt es keinen Hover, also wären die Aktionen
            // dauerhaft unsichtbar, aber ohne pointer-events-none trotzdem
            // per Hit-Testing antippbar — Fehltipps ohne einen Weg, sie
            // absichtlich zu treffen. Deshalb ist "erst bei Hover/Fokus
            // sichtbar" auf @media (hover: hover) beschränkt; ohne
            // Zeigegerät bleiben die Aktionen einfach immer sichtbar. Das
            // weicht bewusst vom Plan ("sichtbar bei Hover und Fokus") ab,
            // weil der Plan Touch nicht bedacht hatte.
            "[@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0",
            "[@media(hover:hover)]:focus-within:pointer-events-auto [@media(hover:hover)]:focus-within:opacity-100",
            "[@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100",
          )}
        >
          {actions}
        </span>
      ) : null}
    </Comp>
  );
}
