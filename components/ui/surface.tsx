"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Surface — die Flaeche, auf der Inhalt liegt.
 *
 * Ersetzt die fruehere Card. Der Unterschied ist Absicht: eine Surface hat
 * keinen Rahmen und keinen Schatten. Abgrenzung entsteht aus der Helligkeit
 * der Flaeche, nicht aus einer Linie — sonst wirken acht Flaechen gleich
 * schwer, und genau das war das Problem.
 *
 * Stufen:
 *   flat    — unbeleuchteter Inhalt (--s1)
 *   raised  — angehoben, z. B. ausgewaehlt (--s2)
 *   input   — Eingabe, Hover (--s3)
 *   overlay — schwebt wirklich ueber Inhalt: Dialog, Popover. Nur hier
 *             gibt es einen Schatten.
 */

export type SurfaceLevel = "flat" | "raised" | "input" | "overlay";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  radius?: "md" | "lg";
  asChild?: boolean;
}

const LEVEL_CLASS: Record<SurfaceLevel, string> = {
  flat: "bg-[var(--s1)]",
  raised: "bg-[var(--s2)]",
  input: "bg-[var(--s3)]",
  overlay: "bg-[var(--s2)] shadow-[var(--shadow-overlay)]",
};

const RADIUS_CLASS = {
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
} as const;

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, level = "flat", radius = "md", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn("border-0", LEVEL_CLASS[level], RADIUS_CLASS[radius], className)}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Surface.displayName = "Surface";
