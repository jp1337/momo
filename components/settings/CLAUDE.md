# components/settings/

## Purpose
Client components for the settings area. The settings UI is split across six sub-pages, each backed by its own Server Component in `app/(app)/settings/*/page.tsx`. All components listed here are `"use client"` and receive initial data as props from their respective Server Component, handling optimistic saves with rollback.

The shared navigation lives in `settings-nav.tsx`. The two-column shell (nav sidebar + content) is in `app/(app)/settings/layout.tsx`.

Sub-page mapping:
- **account/** → `profile-settings.tsx`, `language-switcher.tsx`, `timezone-settings.tsx`, `linked-accounts.tsx`
- **notifications/** → `notification-settings.tsx`, `notification-channels.tsx`, `morning-briefing-settings.tsx`, `notification-history.tsx`
- **quest/** → `quest-settings.tsx`, `vacation-mode-settings.tsx`, `emotional-closure-settings.tsx`
- **security/** → `security-section.tsx`, `passkeys-section.tsx`, `active-sessions.tsx`, `login-notification-settings.tsx`
- **integrations/** → `calendar-feed-section.tsx`, `webhooks.tsx` (OutboundWebhooks)
- **data/** → `delete-account.tsx` (export is a plain `<a download>` link in the Server Component)

## Contents
- `settings-nav.tsx` — Persistent sub-navigation: desktop vertical sidebar + mobile horizontal tab strip; `usePathname()` for active state; amber left-border (desktop) / amber bottom-border (mobile) on active; 6 entries with FontAwesome icons; `nav_*` i18n keys
- `profile-settings.tsx` — Name, email, avatar upload; PATCHes /api/user/profile
- `notification-settings.tsx` — Web Push enable/disable/test + daily reminder time + due-today / overdue / recurring-due toggles; each toggle reveals its own per-type time picker when enabled (dueTodayReminderTime, overdueReminderTime, recurringDueReminderTime); weekly review time always visible as a standalone row; receives `vapidPublicKey` as prop
- `notification-channels.tsx` — Multi-channel setup: ntfy.sh, Pushover, Telegram, Email, **Webhook**; inline forms per channel (WebhookForm: URL + HMAC-SHA256 signing checkbox + secret field); `emailAvailable` + `defaultEmailAddress` props from server
- `notification-history.tsx` — Fetches last 50 delivery attempts from GET /api/settings/notification-history; expandable error details on failed entries
- `morning-briefing-settings.tsx` — Daily digest toggle + time picker; PATCHes /api/push/subscribe
- `vacation-mode-settings.tsx` — Vacation mode toggle + end date picker; active state shows amber info banner + "End now" button; PATCHes /api/settings/vacation-mode
- `quest-settings.tsx` — Postpone limit slider (1–5); PATCHes /api/settings/quest
- `emotional-closure-settings.tsx` — Affirmation toggle; PATCHes /api/settings/quest
- `security-section.tsx` — TOTP 2FA panel: enable, disable, regenerate backup codes (re-verify required)
- `passkeys-section.tsx` — WebAuthn credential list: register, rename, remove; uses @simplewebauthn/browser
- `active-sessions.tsx` — Active sessions list: shows all login sessions with device/browser/OS, IP, timestamps; current session highlighted with green "This device" badge; revoke individual sessions or all-other-sessions; fetches from GET /api/auth/sessions, DELETEs via /api/auth/sessions/:id and POST /api/auth/sessions/revoke-others
- `totp-setup-wizard.tsx` — 2-step TOTP setup modal: QR code → first-code verification
- `backup-codes-display.tsx` — Read-only backup code grid with copy + download
- `calendar-feed-section.tsx` — iCal feed: create/rotate/revoke token; one-time URL display
- `timezone-settings.tsx` — IANA timezone picker with grouped dropdown; auto-saves via PATCH /api/settings/timezone; shows browser-detected timezone + mismatch hint
- `language-switcher.tsx` — UI language switcher (de/en/fr/es/nl); POSTs to /api/locale; flags via `LOCALE_FLAGS` map
- `linked-accounts.tsx` — Connected OAuth providers list; uses next-auth signIn() for linking
- `delete-account.tsx` — Danger zone: account deletion with confirmation dialog

## Patterns
- All components follow the same structure: `useState` for local state, `useCallback` for save function, optimistic UI with rollback on error
- Props always start with `initial*` prefix for server-fetched values
- Status messages use `message` + `messageType` state pair
- Fonts: `var(--font-ui)` for labels/buttons, `var(--font-body)` for input fields
- Colors via CSS variables, never hardcoded
