"use client";

/**
 * IconPicker component — a compact grid picker for topic icons.
 *
 * Renders the currently selected FA icon as a button. Clicking opens
 * a dropdown grid showing all curated icons from TOPIC_ICONS.
 * All icons are from @fortawesome/free-solid-svg-icons — no CDN required.
 */

import { useRef, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TOPIC_ICONS, resolveTopicIcon } from "@/lib/topic-icons";

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
}

/**
 * Icon grid picker — opens a dropdown with all curated FA icons.
 * Stores and returns the string key, not the icon object.
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const currentIcon = resolveTopicIcon(value);
  const iconKeys = Object.keys(TOPIC_ICONS);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger button — shows current icon */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          fontSize: "1rem",
        }}
      >
        <FontAwesomeIcon icon={currentIcon} style={{ width: "1.1rem", height: "1.1rem" }} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>▾</span>
      </button>

      {/* Dropdown grid */}
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: "calc(100% + 4px)",
            left: 0,
            width: "260px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-lg)",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: "4px",
              maxHeight: "240px",
              overflowY: "auto",
            }}
          >
            {iconKeys.map((key) => {
              const icon = TOPIC_ICONS[key];
              const isSelected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  title={key}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "2px solid var(--accent-amber)"
                      : "2px solid transparent",
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--accent-amber) 15%, var(--bg-elevated))"
                      : "var(--bg-elevated)",
                    color: isSelected ? "var(--accent-amber)" : "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.1s, color 0.1s",
                  }}
                >
                  <FontAwesomeIcon icon={icon} style={{ width: "0.9rem", height: "0.9rem" }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
