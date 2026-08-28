"use client";

/**
 * ThemeToggle component.
 * Cycles through dark → light → system themes using next-themes.
 * Shows the current theme as a Font Awesome icon with an accessible label.
 */

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun, faDesktop } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/** Icon und Nachfolge-Theme je Zustand. Die Labels kommen aus i18n. */
const THEME_CONFIG = {
  dark: { icon: faMoon as IconDefinition, next: "light", key: "theme_dark" },
  light: { icon: faSun as IconDefinition, next: "system", key: "theme_light" },
  system: { icon: faDesktop as IconDefinition, next: "dark", key: "theme_system" },
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
  const t = useTranslations("nav");

  // Only render after mount to avoid hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-[var(--radius-sm)] bg-[var(--raised)]" aria-hidden="true" />
    );
  }

  const currentTheme = (theme as ThemeKey) ?? "system";
  const config = THEME_CONFIG[currentTheme] ?? THEME_CONFIG.system;
  const label = t(config.key as "theme_dark" | "theme_light" | "theme_system");

  /**
   * Cycles to the next theme in the rotation: dark → light → system → dark
   */
  function handleToggle() {
    setTheme(config.next);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleToggle}
          aria-label={t("theme_aria", { theme: label })}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--ground)]"
        >
          <FontAwesomeIcon icon={config.icon} className="w-4 h-4" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{t("theme_switch", { theme: label })}</TooltipContent>
    </Tooltip>
  );
}
