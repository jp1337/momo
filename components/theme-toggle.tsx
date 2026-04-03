"use client";

/**
 * ThemeToggle component.
 * Cycles through dark → light → system themes using next-themes.
 * Shows the current theme as a Font Awesome icon with an accessible label.
 */

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun, faDesktop } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/** Maps theme values to display icons and labels */
const THEME_CONFIG = {
  dark: { icon: faMoon as IconDefinition, label: "Dark mode", next: "light" },
  light: { icon: faSun as IconDefinition, label: "Light mode", next: "system" },
  system: { icon: faDesktop as IconDefinition, label: "System theme", next: "dark" },
} as const;

type ThemeKey = keyof typeof THEME_CONFIG;

/**
 * A button that toggles between dark, light, and system themes.
 * Renders nothing during SSR to avoid hydration mismatches.
 *
 * @returns The theme toggle button, or null before hydration
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only render after mount to avoid hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-9 h-9 rounded-lg"
        style={{ backgroundColor: "var(--bg-elevated)" }}
        aria-hidden="true"
      />
    );
  }

  const currentTheme = (theme as ThemeKey) ?? "system";
  const config = THEME_CONFIG[currentTheme] ?? THEME_CONFIG.system;

  /**
   * Cycles to the next theme in the rotation: dark → light → system → dark
   */
  function handleToggle() {
    setTheme(config.next);
  }

  return (
    <button
      onClick={handleToggle}
      title={`Current: ${config.label}. Click to switch.`}
      aria-label={`Switch theme (currently ${config.label})`}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
      }}
    >
      <FontAwesomeIcon icon={config.icon} className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}
