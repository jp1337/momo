"use client";

/**
 * CoinCounter — animated coin balance display for the navbar.
 *
 * Receives the initial coin balance from the server-rendered layout.
 * Listens for "coinsEarned" custom events dispatched by TaskList after
 * task completion, and animates the counter using Framer Motion.
 */

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { COINS_EARNED_EVENT } from "@/lib/client/coin-events";

interface CoinCounterProps {
  /** Initial coin balance fetched server-side */
  initialCoins: number;
}

/**
 * Animated coin counter displayed in the navbar.
 * Counts up smoothly whenever coins are earned from task completion.
 */
export function CoinCounter({ initialCoins }: CoinCounterProps) {
  const t = useTranslations("nav");
  const [displayValue, setDisplayValue] = useState(initialCoins);
  const currentCoins = useRef(initialCoins);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handleCoinsEarned = (e: Event) => {
      const { delta } = (e as CustomEvent<{ delta: number }>).detail;
      const from = currentCoins.current;
      const to = from + delta;
      currentCoins.current = to;

      animate(from, to, {
        duration: 1.2,
        ease: "easeOut",
        onUpdate: (latest) => setDisplayValue(Math.round(latest)),
      });
    };

    window.addEventListener(COINS_EARNED_EVENT, handleCoinsEarned);
    return () => window.removeEventListener(COINS_EARNED_EVENT, handleCoinsEarned);
  }, []);

  return (
    <span
      ref={nodeRef}
      data-testid="coin-counter"
      className="flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-[family-name:var(--font-mono)] text-sm tabular-nums text-[var(--ink-2)]"
      title={t("coin_balance")}
    >
      <FontAwesomeIcon icon={faCoins} className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{displayValue}</span>
    </span>
  );
}
