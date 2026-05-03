/**
 * SettingsSection — reusable card wrapper for settings pages.
 *
 * Replaces the repeated pattern:
 *   <section className="rounded-xl p-6 ..." style={{ ... }}>
 *     <h2 className="text-base font-semibold" style={{ ... }}>...</h2>
 *     <p className="text-sm" style={{ ... }}>...</p>
 *     {content}
 *   </section>
 *
 * Usage:
 *   <SettingsSection title="Account" hint="Manage your profile">
 *     <ProfileSettings ... />
 *   </SettingsSection>
 *
 * Server component — no client interactivity, just markup.
 */

import type { ReactNode } from "react";

interface SettingsSectionProps {
  /** Section title — rendered as h2, Lora display font */
  title: string;
  /** Optional sub-text below the title */
  hint?: string;
  /** Optional eyebrow label (small-caps, amber) above the title */
  eyebrow?: string;
  /** Section body */
  children: ReactNode;
}

export function SettingsSection({ title, hint, eyebrow, children }: SettingsSectionProps) {
  return (
    <section
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
              opacity: 0.85,
            }}
          >
            {eyebrow}
          </span>
        )}
        <h2
          className="text-lg font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h2>
        {hint && (
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
          >
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
