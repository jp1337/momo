"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Label component - Styled label for form inputs.
 */

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, style, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 block",
          className
        )}
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          ...style,
        }}
        {...props}
      >
        {children}
      </label>
    );
  }
);
Label.displayName = "Label";

export { Label };
