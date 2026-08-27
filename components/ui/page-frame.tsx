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
          // `!` auf flex-col/gap-4 (Task 8 fix): Tailwinds custom
          // `--breakpoint-rail` (globals.css) wird nicht numerisch, sondern
          // hinter den eingebauten Breakpoints einsortiert — `sm:flex-row`
          // gewinnt dadurch bei jeder Breite ≥ 1100px gegen `rail:flex-col`,
          // trotz gleicher Spezifität und trotz "sm" (640px) < "rail"
          // (1100px). Sichtbare Folge: der Rand blieb eine zeilenweise
          // gewrappte Reihe statt einer engen Spalte, jedes `<p>` auf die
          // volle Randhöhe gestreckt (`align-items: stretch` im
          // `flex-row`-Kontext). Betraf `/dashboard` genauso — nur nie
          // aufgefallen, weil dort niemand genau hingesehen hat.
          className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6 rail:w-[var(--rail)] rail:shrink-0 rail:flex-col! rail:gap-4!"
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
