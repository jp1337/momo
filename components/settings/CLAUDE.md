# components/settings/

## Purpose
Client components for the `/settings` page. Each file is one section of the settings UI. All are "use client" components that receive initial data from the Server Component in `app/(app)/settings/page.tsx` and handle optimistic saves.

## Contents
- `profile-settings.tsx` — Name, email, avatar upload; PATCHes /api/user/profile
- `notification-settings.tsx` — Web Push enable/disable/test + daily reminder time; receives `vapidPublicKey` as prop
- `notification-channels.tsx` — Multi-channel setup: ntfy.sh, Pushover, Telegram, Email; inline forms per channel; `emailAvailable` + `defaultEmailAddress` props from server
- `notification-history.tsx` — Fetches last 50 delivery attempts from GET /api/settings/notification-history; expandable error details on failed entries
- `morning-briefing-settings.tsx` — Daily digest toggle + time picker; PATCHes /api/push/subscribe
- `vacation-mode-settings.tsx` — Vacation mode toggle + end date picker; active state shows amber info banner + "End now" button; PATCHes /api/settings/vacation-mode
- `quest-settings.tsx` — Postpone limit slider (1–5); PATCHes /api/settings/quest
- `emotional-closure-settings.tsx` — Affirmation toggle; PATCHes /api/settings/quest
- `security-section.tsx` — TOTP 2FA panel: enable, disable, regenerate backup codes (re-verify required)
- `passkeys-section.tsx` — WebAuthn credential list: register, rename, remove; uses @simplewebauthn/browser
- `totp-setup-wizard.tsx` — 2-step TOTP setup modal: QR code → first-code verification
- `backup-codes-display.tsx` — Read-only backup code grid with copy + download
- `calendar-feed-section.tsx` — iCal feed: create/rotate/revoke token; one-time URL display
- `timezone-settings.tsx` — IANA timezone picker with grouped dropdown; auto-saves via PATCH /api/settings/timezone; shows browser-detected timezone + mismatch hint
- `language-switcher.tsx` — UI language switcher (de/en/fr); POSTs to /api/locale
- `linked-accounts.tsx` — Connected OAuth providers list; uses next-auth signIn() for linking
- `delete-account.tsx` — Danger zone: account deletion with confirmation dialog

## Patterns
- All components follow the same structure: `useState` for local state, `useCallback` for save function, optimistic UI with rollback on error
- Props always start with `initial*` prefix for server-fetched values
- Status messages use `message` + `messageType` state pair
- Fonts: `var(--font-ui)` for labels/buttons, `var(--font-body)` for input fields
- Colors via CSS variables, never hardcoded
