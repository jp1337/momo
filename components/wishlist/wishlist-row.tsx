"use client";

/**
 * WishlistRow — ein Wunsch als Zeile.
 *
 * Ersetzt `wishlist-card.tsx` (667 Zeilen, 59 Ratschen-Verstöße). Die Karte
 * verschwindet als Konzept; übrig bleiben Zeile, Kaufaktion und Wischgeste
 * (Spec §3). Was die Karte kodierte und wie es jetzt kodiert ist:
 *
 * | Karte | Zeile |
 * |---|---|
 * | Prioritäts-Chip, farbig und umrahmt | `eyebrow`, Mono-Versalien |
 * | Preis 1.625rem in `--accent-amber` | `trailing`, Mono `tabular-nums`, `--ink-3` |
 * | Münz-Fortschrittsring: SVG, 🪙, zwei Farben | Mono-Bruch im `eyebrow`: `34 / 50` |
 * | Münz-Fortschrittsbanner mit Balken | derselbe Bruch — der Ring und der Balken zeigten dieselbe Zahl zweimal |
 * | "Gekauft"-Statusabzeichen, grüner Rand links | `dimmed` plus ein Wort im `eyebrow` |
 * | "Verworfen"-Statusabzeichen, grauer Rand links | `tone="secondary"` plus ein Wort im `eyebrow` — NICHT `dimmed` (siehe unten) |
 *
 * **N Karten waren N Amber.** Der Preis war der Grund, warum die Regel
 * "Amber höchstens einmal je Seite" auf /wishlist nicht annähernd galt.
 *
 * "Leistbar" und "über Budget" bleiben als Text erhalten, aber ohne Farbe:
 * `--done` bedeutet ausschließlich "erledigt" und `--danger` ausschließlich
 * Zerstörung und Überfälligkeit — eine Preisbewertung ist keins von beidem.
 *
 * **Warum `BOUGHT` und `DISCARDED` unterschiedliche Behandlung bekommen,
 * obwohl beide "nicht mehr offen" sind:** `Row`s `dimmed` ist keine
 * Abschwächung, sondern die feste Bedeutung "erledigt" — `--ink-3` plus
 * Durchstreichung (`components/ui/list.tsx`). Ein gekaufter Wunsch IST
 * erledigt, genau wie eine abgehakte Aufgabe: `dimmed` ist hier wahr.
 * Ein verworfener Wunsch ist aufgegeben, nicht erledigt — ihn
 * durchzustreichen würde behaupten, er sei geschafft worden. Verworfene
 * Einträge bekommen stattdessen `tone="secondary"` (`--ink-2`, ohne
 * Durchstreichung) — dieselbe Abstufung wie bei nicht verdienten
 * Errungenschaften in `achievement-row.tsx`.
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Row } from "@/components/ui/list";
import { useTaskSwipe } from "@/components/tasks/use-task-swipe";
import { WishlistRowActions } from "./wishlist-row-actions";

export interface WishlistRowProps {
  id: string;
  title: string;
  /** Roher Dezimalstring aus der DB, oder null. */
  price: string | null;
  url: string | null;
  priority: "WANT" | "NICE_TO_HAVE" | "SOMEDAY";
  status: "OPEN" | "BOUGHT" | "DISCARDED";
  coinUnlockThreshold: number | null;
  userCoins: number;
  monthlyBudget: number | null;
  remainingBudget: number | null;
  onBuy: (id: string) => void;
  onUnbuy: (id: string) => void;
  onDiscard: (id: string) => void;
  onUndiscard: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Ein Wunsch als `Row`.
 *
 * @param props - siehe WishlistRowProps
 * @returns Eine Zeile ohne Fläche, ohne Rahmen, ohne Farbring
 */
export function WishlistRow(props: WishlistRowProps) {
  const t = useTranslations("wishlist");
  const locale = useLocale();

  const isOpen = props.status === "OPEN";
  const numericPrice = props.price !== null ? Number(props.price) : null;

  const hasThreshold =
    props.coinUnlockThreshold !== null && props.coinUnlockThreshold > 0;
  const locked = isOpen && hasThreshold && props.userCoins < props.coinUnlockThreshold!;
  const coinsNeeded = hasThreshold
    ? Math.max(0, props.coinUnlockThreshold! - props.userCoins)
    : 0;

  const swipe = useTaskSwipe({
    // Ein gesperrter Wunsch darf nicht per Wisch gekauft werden, aber sehr
    // wohl verworfen — `disabled` wäre beides auf einmal.
    onComplete: () => {
      if (!locked) props.onBuy(props.id);
    },
    onDelete: () => props.onDiscard(props.id),
    disabled: !isOpen,
  });

  // Die Wisch-Vorschau steht nur während der Geste im DOM. `countBoxes` hat
  // seit Task 8 der Phase 1 zwar einen Opazitäts-Wächter, aber
  // vorübergehendes Feedback muss im Ruhezustand gar nicht existieren —
  // dieselbe Begründung wie in `task-row.tsx`.
  const [panelMounted, setPanelMounted] = useState(false);
  useEffect(() => {
    if (swipe.isSwiping) {
      setPanelMounted(true);
      return;
    }
    const id = setTimeout(() => setPanelMounted(false), 250);
    return () => clearTimeout(id);
  }, [swipe.isSwiping]);

  const eyebrowParts: string[] = [
    t(
      props.priority === "WANT"
        ? "priority_want"
        : props.priority === "NICE_TO_HAVE"
          ? "priority_nice"
          : "priority_someday",
    ),
  ];
  if (isOpen && hasThreshold) {
    eyebrowParts.push(`${props.userCoins} / ${props.coinUnlockThreshold}`);
  }
  if (isOpen && numericPrice !== null && props.monthlyBudget !== null) {
    eyebrowParts.push(
      props.remainingBudget !== null && numericPrice <= props.remainingBudget
        ? t("card_affordable")
        : t("card_over_budget"),
    );
  }
  if (props.status === "BOUGHT") eyebrowParts.push(t("card_bought"));
  if (props.status === "DISCARDED") eyebrowParts.push(t("card_discarded"));

  return (
    <Row
      as={motion.li}
      testId="wishlist-row"
      wrapTitle
      dimmed={props.status === "BOUGHT"}
      tone={props.status === "DISCARDED" ? "secondary" : "primary"}
      className="relative overflow-hidden touch-pan-y"
      animate={{ x: swipe.swipeX }}
      transition={{
        x: swipe.isSwiping
          ? { duration: 0 }
          : { type: "spring", stiffness: 400, damping: 35 },
      }}
      onTouchStart={swipe.handlers.onTouchStart}
      onTouchMove={swipe.handlers.onTouchMove}
      onTouchEnd={swipe.handlers.onTouchEnd}
      lead={
        <>
          {/* Rechts wischen = gekauft. `--done` ist hier korrekt: ein
              gekaufter Wunsch IST erledigt — dieselbe Bedeutung wie eine
              abgehakte Aufgabe, nicht eine zweite. */}
          {panelMounted && isOpen && !locked && (
            <motion.span
              aria-hidden="true"
              animate={{ opacity: Math.max(0, Math.min(swipe.progress, 1)) }}
              transition={{ duration: swipe.isSwiping ? 0 : 0.2 }}
              className="pointer-events-none absolute inset-y-0 left-0 flex min-w-[90px] items-center gap-2 bg-[var(--done)] px-4 text-[var(--ground)]"
            >
              {swipe.progress > 0.5 && (
                <span className="font-[family-name:var(--font-ui)] text-xs font-semibold">
                  {t("card_bought")}
                </span>
              )}
            </motion.span>
          )}
          {/* Links wischen = verwerfen. `--danger`, wie beim Löschen einer Zeile. */}
          {panelMounted && isOpen && (
            <motion.span
              aria-hidden="true"
              animate={{ opacity: Math.max(0, Math.min(-swipe.progress, 1)) }}
              transition={{ duration: swipe.isSwiping ? 0 : 0.2 }}
              className="pointer-events-none absolute inset-y-0 right-0 flex min-w-[90px] items-center justify-end gap-2 bg-[var(--danger)] px-4 text-[var(--ground)]"
            >
              {swipe.progress < -0.5 && (
                <span className="font-[family-name:var(--font-ui)] text-xs font-semibold">
                  {t("card_btn_discard")}
                </span>
              )}
            </motion.span>
          )}
        </>
      }
      title={
        props.url ? (
          // Keine eigene `className`: `globals.css`s ungelayerte a-Regel
          // setzt `color: inherit` und die haarlinienfarbene
          // Unterstreichung — sie schlägt jede @layer-utilities-Klasse
          // (dieselbe Falle wie in `topic-card.tsx` dokumentiert).
          <a href={props.url} target="_blank" rel="noopener noreferrer" title={props.url}>
            {props.title}
          </a>
        ) : (
          props.title
        )
      }
      eyebrow={eyebrowParts.join(" · ")}
      trailing={
        numericPrice !== null
          ? `€${numericPrice.toLocaleString(locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : undefined
      }
      actions={
        <WishlistRowActions
          id={props.id}
          status={props.status}
          locked={locked}
          coinUnlockThreshold={props.coinUnlockThreshold}
          coinsNeeded={coinsNeeded}
          onBuy={props.onBuy}
          onUnbuy={props.onUnbuy}
          onDiscard={props.onDiscard}
          onUndiscard={props.onUndiscard}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      }
    />
  );
}
