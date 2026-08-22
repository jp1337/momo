"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Button component - A versatile button that follows Momo's design system.
 */

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">>,
    HTMLMotionProps<"button"> {
  variant?: "primary" | "quiet" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "quiet", size = "md", asChild = false, style, children, ...props }, ref) => {
    const Comp = (asChild ? Slot : motion.button) as typeof motion.button;

    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap border-0 " +
      "rounded-[var(--radius-sm)] text-sm font-semibold transition-colors duration-150 " +
      "disabled:opacity-50 disabled:pointer-events-none cursor-pointer outline-none";

    // primary traegt Amber als Textfarbe, nicht als Flaeche: Amber ist Licht.
    // Es gibt genau eine primary-Handlung pro Seite. Kein Rahmen hier — das
    // Amber selbst ist das Signal, eine Kante wuerde nur konkurrieren. Der
    // Hover ist bewusst `hover:underline` statt einer Hintergrundflaeche
    // (Task B4, 2026-08-22): `hover:bg-[var(--raised)]` stellte Amber-Text
    // auf --raised, was im Light Mode nur 3.87:1 erreicht (--raised liegt im
    // Hellen dunkler als --ground) — kein Wert von --amber, der das UND
    // 4.5:1 gegen --ground haelt, liest noch als Amber statt als Braun.
    // Ausserdem war die Flaeche ohnehin die einzige Stelle, an der ein
    // "primary"-Button — Amber pur als Text, nie eine Flaeche — vorruebergehend
    // eine Flaeche bekam. Eine Unterstreichung ist derselbe Hover-Hinweis,
    // den die amber-Textlinks anderswo im Code schon verwenden.
    //
    // quiet IST eine Affordanz und bekommt deshalb --raised plus die 1px-
    // Haarlinie (siehe Surface): ohne Kante mass dieser Button vorher nur
    // 1.16:1 Kontrast gegen den Grund — er las sich als Loch, nicht als
    // Button. Hover ist --raised -> --hairline in der Flaeche gedacht, aber
    // die Haarlinie ist zu hell/dunkel fuer Text (3.42:1 Light / 3.77:1
    // Dark) — der Hover behaelt deshalb --raised als Flaeche und hebt sich
    // stattdessen ueber die Haarlinie als Rahmenfarbe ab (siehe unten), statt
    // --ink-Text auf eine zu helle/dunkle Flaeche zu legen.
    // Text-color utilities carry a trailing `!` (Task B2 fix, 2026-08-22):
    // globals.css has an unlayered `a { color: var(--accent-amber); }` link
    // default (line ~599). Tailwind's own utilities live inside `@layer
    // utilities`, and an unlayered rule beats every layered one regardless
    // of selector specificity per the CSS Cascade Layers spec — so a plain
    // `text-[var(--ink)]` class LOSES to that global rule whenever `asChild`
    // renders Button as an `<a>` (e.g. wrapping a next/link `Link`), even
    // though the class is more specific by the ordinary specificity rules
    // everyone reasons about. Found by actually looking at the dashboard's
    // new-user state: the "Create first topic" quiet Button, composed with
    // Link via asChild, rendered amber text instead of --ink — a second
    // amber element on the page, invisible to any test that never exercises
    // that state. `!important` from Tailwind's own syntax is the correct
    // tool for "this component's variant intent must not lose to page
    // chrome," not a hack — it does not touch the unrelated global rule,
    // which many un-migrated pages still rely on for their plain links.
    const variantStyles = {
      primary: "bg-transparent text-[var(--amber)]! hover:underline",
      quiet:
        "bg-[var(--raised)] border border-[var(--hairline)] text-[var(--ink)]! hover:border-[var(--ink-2)]",
      danger: "bg-transparent text-[var(--danger)]! hover:bg-[var(--raised)]",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-xs",
      md: "h-10 px-5 py-2.5",
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10",
    };

    const combinedStyle = {
      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
      ...style,
    };

    // `whileTap` used to be passed as `asChild ? undefined : {...}` — a prop
    // with the KEY always present, just sometimes holding `undefined`. When
    // asChild renders Comp as Radix's Slot, Slot merges every own key of its
    // props onto the single child regardless of value, so the child (e.g. a
    // next/link Link, which resolves to a plain `<a>`) received a literal
    // `whileTap` attribute and React warned about an unrecognized DOM prop.
    // Omitting the key entirely when asChild is true (found by actually
    // looking at the dashboard's new-user state and reading the console,
    // not by the type system) avoids Slot ever seeing it.
    const motionProps = asChild ? {} : { whileTap: { scale: 0.98 } };

    return (
      <Comp
        ref={ref}
        {...motionProps}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        style={combinedStyle}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button };
