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
    // Amber selbst ist das Signal, eine Kante wuerde nur konkurrieren.
    //
    // quiet IST eine Affordanz und bekommt deshalb --raised plus die 1px-
    // Haarlinie (siehe Surface): ohne Kante mass dieser Button vorher nur
    // 1.16:1 Kontrast gegen den Grund — er las sich als Loch, nicht als
    // Button.
    const variantStyles = {
      primary: "bg-transparent text-[var(--amber)] hover:bg-[var(--raised)]",
      quiet:
        "bg-[var(--raised)] border border-[var(--hairline)] text-[var(--ink)] hover:bg-[var(--hairline)]",
      danger: "bg-transparent text-[var(--danger)] hover:bg-[var(--raised)]",
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

    return (
      <Comp
        ref={ref}
        whileTap={asChild ? undefined : { scale: 0.98 }}
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
