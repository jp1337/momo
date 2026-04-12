/**
 * Shared locale constants — importable from both server and client code.
 *
 * Kept separate from i18n/request.ts so that client components can import
 * LOCALES without pulling in next/headers (a server-only module).
 *
 * To add a new language:
 *  1. Add its code to LOCALES below
 *  2. Create messages/XX.json
 *  3. Add a flag entry in components/settings/language-switcher.tsx
 */

export const LOCALES = ["de", "en", "fr", "es", "nl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";
