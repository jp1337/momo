import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PageFrame — Maß, Rand, Rhythmus für eine Seite.
 *
 * In die Lesespalte gehört, was der Nutzer *tut*. In den Rand gehört, was
 * die App *über* seinen Tag sagt: Zähler, Summen, Filter. Der Rand trägt
 * nie Amber — sonst wäre er eine zweite Lichtquelle.
 *
 * Der Rand ist optional, weil die Seiten wirklich verschieden sind:
 * `/focus` ist eine Bühne, auf der eine Sache zählt, und eine erzwungene
 * Randspalte auf einer Bühne wäre dieselbe Gleichmacherei, die dieser
 * Entwurf abschafft.
 *
 * Umbruch: unter 1100 px (`rail:`) fällt der Rand unter den Inhalt und
 * legt seine Fakten in eine umbrechende Zeile; unter 640 px (`sm:`)
 * stapelt er am Seitenende.
 */
export interface PageFrameProps {
  /** Die Lesespalte — der Inhalt, mit dem der Nutzer arbeitet. */
  children: React.ReactNode;
  /** Die Randnotiz. Weglassen heißt: diese Seite hat keinen Rand. */
  rail?: React.ReactNode;
  className?: string;
}

/**
 * Zentriert den Block aus Lesespalte und optionalem Rand im Inhaltsbereich.
 *
 * @param children - Inhalt der Lesespalte
 * @param rail - Inhalt der Randspalte, oder nichts
 * @param className - zusätzliche Klassen für den äußeren Block
 * @returns Der Seitenrahmen
 */
export function PageFrame({ children, rail, className }: PageFrameProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-8",
        rail
          ? "max-w-[calc(var(--measure)_+_var(--gutter)_+_var(--rail))] rail:flex-row rail:gap-[var(--gutter)]"
          : "max-w-[var(--measure)]",
        className,
      )}
    >
      <div data-column className="flex w-full min-w-0 max-w-[var(--measure)] flex-col gap-8">
        {children}
      </div>
      {rail ? (
        <aside
          data-rail
          // Drei Bänder, sich gegenseitig ausschließend, damit die
          // Quellreihenfolge der Utilities nie eine Rolle spielt (Task 8
          // Review-Fund: `rail:flex-col!` funktionierte, war aber ein
          // Notbehelf gegen eine Sortier-Eigenheit, die ein Tailwind-Upgrade
          // stillschweigend ändern kann):
          //   < 640px         — Basisklassen (flex-col gap-3)
          //   640px – 1100px  — sm:max-rail:flex-row/flex-wrap/gap-6
          //   ≥ 1100px        — wieder die Basis (flex-col), plus rail:gap-4
          // `sm:max-rail:` erzeugt ein verschachteltes
          // `@media (width>=40rem){@media(width<1100px){…}}` — dessen
          // Bedingung und die von `rail:` (`width>=1100px`) überschneiden
          // sich nie, also entscheidet nie die Regelreihenfolge, sondern nur
          // die tatsächliche Breite. `rail:flex-col` entfällt deshalb ganz:
          // die Basis ist bereits `flex-col`, und kein `!` wird gebraucht.
          className="flex w-full flex-col gap-3 sm:max-rail:flex-row sm:max-rail:flex-wrap sm:max-rail:gap-6 rail:w-[var(--rail)] rail:shrink-0 rail:gap-4"
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
