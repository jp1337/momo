"use client";

/**
 * ConfirmButton — inline two-step confirmation that replaces window.confirm.
 *
 * On first click shows a "confirm?" state with Yes/Cancel buttons inline.
 * Escape or clicking Cancel returns to the idle state.
 * Supports any trigger content via children.
 */

import { useState, useEffect, useRef } from "react";

interface ConfirmButtonProps {
  /** Called when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Normal button content (icon, text, etc.) */
  children: React.ReactNode;
  /** Text shown next to Yes/Cancel when confirming */
  confirmPrompt?: string;
  /** Label for the confirm button */
  yesLabel?: string;
  /** Label for the cancel button */
  noLabel?: string;
  /** Extra classes applied to the trigger button */
  className?: string;
  /** Extra styles applied to the trigger button */
  style?: React.CSSProperties;
  disabled?: boolean;
  /** aria-label for the trigger button */
  "aria-label"?: string;
}

export function ConfirmButton({
  onConfirm,
  children,
  confirmPrompt,
  yesLabel = "Yes",
  noLabel = "Cancel",
  className,
  style,
  disabled,
  "aria-label": ariaLabel,
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const yesRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (confirming) yesRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!confirming) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(false);
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [confirming]);

  // Close confirm state when clicking outside
  useEffect(() => {
    if (!confirming) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [confirming]);

  if (!confirming) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      ref={wrapperRef}
      className="inline-flex items-center gap-1"
      style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)" }}
    >
      {confirmPrompt && (
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {confirmPrompt}
        </span>
      )}
      <button
        ref={yesRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(false);
          onConfirm();
        }}
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "4px",
          border: "1px solid var(--accent-red, #e53e3e)",
          background: "var(--accent-red, #e53e3e)",
          color: "#fff",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(false);
        }}
        style={{
          fontSize: "0.7rem",
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: "4px",
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {noLabel}
      </button>
    </span>
  );
}
