"use client";

/**
 * IconPicker component — a compact grid picker for topic icons.
 *
 * Built on Radix UI Popover primitive — focus management, Esc key, outside-click,
 * and tab-trap inside the popover are handled by the library. The grid itself is
 * still custom (no Radix toolbar/grid roving-tabindex) but `Tab` lets keyboard
 * users walk through every icon, and `Enter` selects.
 */

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as Popover from "@radix-ui/react-popover";
import { TOPIC_ICONS, resolveTopicIcon } from "@/lib/topic-icons";

interface IconPickerProps {
  value: string;
  onChange: (key: string) => void;
}

/**
 * Icon grid picker — opens a popover with all curated FA icons.
 * Stores and returns the string key, not the icon object.
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  const currentIcon = resolveTopicIcon(value);
  const iconKeys = Object.keys(TOPIC_ICONS);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Pick an icon"
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
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          style={{
            zIndex: 1000,
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
                <Popover.Close asChild key={key}>
                  <button
                    type="button"
                    onClick={() => onChange(key)}
                    title={key}
                    aria-label={`Icon: ${key}`}
                    aria-pressed={isSelected}
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
                </Popover.Close>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
