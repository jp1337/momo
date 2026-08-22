"use client";

/**
 * Dialog — Momo-styled wrapper around Radix UI Dialog primitive.
 *
 * Provides accessibility (focus trap, scroll lock, Esc key, ARIA) for free,
 * while keeping the visual identity defined by Momo's CSS variables.
 *
 * Usage:
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <DialogContent title="My title" description="Optional description">
 *       <YourContent />
 *     </DialogContent>
 *   </Dialog>
 */

import * as RadixDialog from "@radix-ui/react-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ReactNode, CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Surface } from "@/components/ui/surface";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

interface DialogContentProps {
  /** Visible heading rendered inside the dialog (also exposed as accessible name) */
  title: string;
  /** Optional accessible description; rendered visually under the title when provided */
  description?: string;
  /** Hides the close (X) button in the header */
  hideClose?: boolean;
  /** Max width preset — `sm` (28rem), `md` (32rem), `lg` (42rem), `xl` (56rem) */
  size?: "sm" | "md" | "lg" | "xl";
  /** Custom inline style on the content surface */
  style?: CSSProperties;
  /** Dialog body */
  children: ReactNode;
}

const SIZE_MAP: Record<NonNullable<DialogContentProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * DialogContent — renders a portalled, accessible modal with Momo's surface styling.
 * Includes overlay, focus trap, scroll lock, Esc-to-close, and a built-in close button.
 */
export function DialogContent({
  title,
  description,
  hideClose = false,
  size = "md",
  style,
  children,
}: DialogContentProps) {
  const tc = useTranslations("common");

  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay
        // Frosted overlay — blurs the page behind the modal instead of just
        // dimming it. Per the calm-design references, this creates layering
        // depth without aggressive contrast.
        className="fixed inset-0 z-40 frosted-overlay data-[state=open]:animate-in data-[state=closed]:animate-out"
      />
      {/* Task B9 (2026-08-22): the dialog surface used to be styled inline
          with `var(--bg-surface)` (aliases to --ground — the same fill as
          the page behind it) plus a 1px hairline and rounded-2xl (16px, off
          the four-value radius scale). Measured, the dialog fill equalled
          the page fill in both themes: a ΔL* 0 box with a visible hairline
          is a pure outline around a content group, not the "Fläche, keine
          Haarlinie" docs/design-system.md documents for dialogs. `Surface
          level="overlay"` exists for exactly this — a fill distinct from
          --ground plus `--shadow-overlay`, no hairline (the scrim already
          grounds it) — and was unused until now. `RadixDialog.Content`
          takes `asChild` so Surface becomes the actual portalled/focused
          element instead of an extra wrapper div; Radix's Slot merges its
          generated props (role, data-state, focus trap, positioning
          classes) onto Surface via composed refs/className, the same
          composition Button's `asChild` already relies on. */}
      <RadixDialog.Content asChild>
        <Surface
          level="overlay"
          radius="lg"
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 p-6 ${SIZE_MAP[size]}`}
          style={{
            maxHeight: "90vh",
            overflowY: "auto",
            ...style,
          }}
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <RadixDialog.Title
                className="text-xl font-semibold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: "var(--text-primary)",
                }}
              >
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description
                  className="text-sm mt-1"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                  }}
                >
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            {!hideClose && (
              <RadixDialog.Close
                className="p-2.5 -m-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-label={tc("close")}
              >
                <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
              </RadixDialog.Close>
            )}
          </div>

          {children}
        </Surface>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/**
 * DialogClose — re-export of Radix's Close primitive for use inside dialog footers.
 * Buttons that should close the dialog wrap their content in <DialogClose asChild>.
 */
export const DialogClose = RadixDialog.Close;
