"use client";

/**
 * CoinCounter — animated coin balance display for the navbar.
 *
 * Receives the initial coin balance from the server-rendered layout.
 * Listens for "coinsEarned" custom events dispatched by TaskList after
 * task completion, and animates the counter using Framer Motion.
 */

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface CoinCounterProps {
  /** Initial coin balance fetched server-side */
  initialCoins: number;
}

/**
 * Animated coin counter displayed in the navbar.
 * Counts up smoothly whenever coins are earned from task completion.
 */
export function CoinCounter({ initialCoins }: CoinCounterProps) {
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

    window.addEventListener("coinsEarned", handleCoinsEarned);
    return () => window.removeEventListener("coinsEarned", handleCoinsEarned);
  }, []);

  return (
    <span
      ref={nodeRef}
      className="flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-lg"
      style={{
        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
        color: "var(--coin-gold)",
        backgroundColor: "rgba(212,160,23,0.12)",
        border: "1px solid rgba(212,160,23,0.25)",
      }}
      title="Your coin balance"
    >
      ◎ <span>{displayValue}</span>
    </span>
  );
}
