"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Surface — die Fläche für eine Affordanz, nicht für Inhalt.
 *
 * Revidiert 2026-08-21: Surface hatte vier Stufen (flat/raised/input/overlay)
 * auf einer vierstufigen Flächenleiter, die selbst das Problem war, das
 * dieser Entwurf abschaffen wollte — gemessen trug sie ohnehin nichts
 * (ΔL* ≈ 3 zwischen Nachbarstufen, weit unter der Wahrnehmungsgrenze ΔL* 8).
 *
 * Jetzt gilt: **es gibt keine Stufe für gewöhnlichen Inhalt.** Inhalt liegt
 * direkt auf `--ground` und braucht überhaupt keine Surface — Abstand und
 * Typografie gruppieren schon. Eine Surface entsteht nur, wo eine Kante
 * tatsächlich etwas aussagt:
 *
 *   raised  — eine echte Affordanz (Eingabefeld, Button, Hover): Fläche
 *             UND eine 1px-Haarlinie. Die Kante ist hier Information —
 *             sie sagt „hier kannst du tippen oder drücken".
 *   overlay — schwebt wirklich über Inhalt (Dialog, Popover): Fläche plus
 *             `--shadow-overlay`, aber KEINE Haarlinie — der Scrim
 *             übernimmt die Abgrenzung.
 */

export type SurfaceLevel = "raised" | "overlay";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  radius?: "md" | "lg";
  asChild?: boolean;
}

const LEVEL_CLASS: Record<SurfaceLevel, string> = {
  raised: "bg-[var(--raised)] border border-[var(--hairline)]",
  overlay: "bg-[var(--raised)] border-0 shadow-[var(--shadow-overlay)]",
};

const RADIUS_CLASS = {
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
} as const;

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, level = "raised", radius = "md", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn(LEVEL_CLASS[level], RADIUS_CLASS[radius], className)}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Surface.displayName = "Surface";
