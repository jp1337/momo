"use client";

import { useRef, useState } from "react";

/** Ab dieser Auslenkung löst das Wischen aus. */
const SWIPE_THRESHOLD = 80;
/** Weiter als das folgt die Zeile dem Finger nicht. */
const SWIPE_MAX = 110;

/**
 * Wischen zum Abhaken (nach rechts) und zum Löschen (nach links).
 *
 * Wörtlich aus task-item.tsx übernommen; hier als Hook, damit die Zeile
 * selbst nichts als Darstellung ist. Die Achsensperre ist der Grund, warum
 * die Seite beim vertikalen Wischen weiter scrollt: ist die Bewegung mehr
 * vertikal als horizontal (plus 10 px Toleranz), bricht die Geste ab.
 *
 * @param onComplete - wird bei einem Wisch nach rechts aufgerufen
 * @param onDelete - wird bei einem Wisch nach links aufgerufen
 * @param disabled - true, wenn die Zeile gerade bearbeitet oder erledigt ist
 * @returns Auslenkung, Wischzustand und die drei Touch-Handler
 */
export function useTaskSwipe({
  onComplete,
  onDelete,
  disabled,
}: {
  onComplete: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  /** Beginnt die Verfolgung einer möglichen horizontalen Wischgeste. */
  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  /** Aktualisiert die Auslenkung; bricht bei vertikaler Geste ab. */
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > Math.abs(deltaX) + 10) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    setIsSwiping(true);
    setSwipeX(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, deltaX)));
  };

  /** Löst die Aktion aus oder schnappt zurück. */
  const onTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (swipeX > SWIPE_THRESHOLD) onComplete();
      else if (swipeX < -SWIPE_THRESHOLD) onDelete();
    }
    setSwipeX(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return { swipeX, isSwiping, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
