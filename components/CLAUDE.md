# components/

## Purpose
UI components. Dumb by design — receive props, render UI, emit events upward. No business logic, no direct DB access.

## Contents
- `theme-toggle.tsx` — Cycles dark → light → system using next-themes
- `layout/navbar.tsx` — Top bar: app name (Lora font), ThemeToggle, coin display, user avatar dropdown
- `layout/sidebar.tsx` — Left navigation (hidden on mobile), active route highlighting; includes 5-Min quick mode entry (faBolt)
- `layout/mobile-nav.tsx` — Fixed bottom tab bar (mobile only, md:hidden): Dashboard/5 Min/Tasks/Topics/Wishlist
- `layout/user-menu.tsx` — Avatar dropdown: Settings, API Keys, Stats, Admin (if isAdmin), Sign out
- `ui/` — shadcn/ui base components (Button, Card, etc.) — heavily customized to use CSS variables
- `tasks/task-item.tsx` — Single task row: checkbox, Framer Motion completion animation, priority badges, topic tag, due date, estimatedMinutes badge, energyLevel badge (⚡/☀/🌙), postponeCount badge, breakdown button, snooze button (clock icon with popover: tomorrow/week/month/custom date), snoozed-until badge; optional **selectionMode** props (isSelected/onToggleSelect) — in selection mode shows amber checkbox instead of completion, hides edit/delete buttons
- `tasks/task-form.tsx` — Create/edit modal; fields: title, type, priority, topicId, dueDate, coinValue, estimatedMinutes (5/15/30/60 min), energyLevel (HIGH/MEDIUM/LOW/null), notes, recurrenceInterval
- `tasks/task-list.tsx` — Groups tasks into Today/Upcoming/No Date/Someday/Snoozed/Completed sections; manages client state, fires coinsEarned CustomEvent on complete/uncomplete, sends timezone in complete POST, renders live active/completed subtitle, handles snooze/unsnooze via /api/tasks/:id/snooze; **bulk selection mode** with selectedIds state, "Select" toggle button, select all/deselect, bulk action handlers (delete/complete/changeTopic/setPriority via PATCH /api/tasks/bulk)
- `tasks/bulk-action-bar.tsx` — Sticky bottom bar shown when ≥1 task is selected in bulk mode; Framer Motion slide-up/down; action buttons: Complete (green), Change Topic (dropdown), Set Priority (dropdown), Delete (red); dumb component, all actions are callbacks
- `tasks/task-breakdown-modal.tsx` — Modal to split a task into 2–5 subtasks inside a new topic; POSTs to /api/tasks/:id/breakdown
- `tasks/due-today-banner.tsx` — Banner shown on tasks page when tasks are overdue or due today
- `topics/topic-card.tsx` — Topic card: FA icon (resolveTopicIcon), color, progress bar (X/Y subtasks), priority badge
- `topics/topic-form.tsx` — Create/edit modal with local FA icon picker (IconPicker) + color swatches; no external emoji CDN
- `topics/topics-grid.tsx` — Responsive grid (1/2/3 cols), handles topic CRUD state
- `topics/topic-detail-view.tsx` — Scoped task list for a single topic; full parity with TaskList (confetti, coin events, level-up, achievements, timezone); active tasks are drag-and-drop reorderable via SortableTaskList
- `topics/sortable-task-list.tsx` — Drag-and-drop reorderable task list using @dnd-kit; PointerSensor (mouse), TouchSensor (200ms delay), KeyboardSensor; DragOverlay for smooth preview; restrictToVerticalAxis modifier; optimistic reorder via onReorder callback
- `topics/sortable-task-item.tsx` — Wraps TaskItem with dnd-kit useSortable hook; renders drag handle (6-dot grip SVG) to the left; touch-action: none on handle to avoid swipe conflict
- `topics/icon-picker.tsx` — 6-column FA icon grid picker; used in topic-form instead of emoji-picker
- `dashboard/daily-quest-card.tsx` — Hero card: quest display, postpone (with daily limit counter), energy-match badge on active quest, celebration state all day after completion; fires coinsEarned event. Energy check-in itself lives in EnergyCheckinCard above this card on the dashboard
- `dashboard/energy-checkin-card.tsx` — Inline energy check-in widget at the top of the dashboard. Renders 3 large buttons (HIGH/MEDIUM/LOW) when not yet checked in today; collapses to a thin status bar with "Change" button after check-in. Computes "today" client-side via `new Date().toLocaleDateString("en-CA")` (NOT server-side) — this is the structural fix for the Bug B timezone bug. Calls POST /api/energy-checkin which auto-rerolls the quest; on `swapped=true` shows an inline Undo banner that POSTs to /api/daily-quest/restore. Self-contained — receives only `energyLevel` + `energyLevelDate` raw props from the dashboard SSR
- `stats/energy-week-block.tsx` — Stats page energy summary block. Three count pills (HIGH/MEDIUM/LOW for the last 7 days) + 14-day mini-chart (CSS grid columns, no chart lib). Pure server component; receives pre-fetched data via props. Empty-state hint when the user has never checked in
- `quick/five-minute-view.tsx` — Focused 5-min task view: flat list of tasks with estimatedMinutes ≤ 5, reuses TaskItem, full completion animations (confetti, coins, level-up, achievements), AnimatePresence exit animation, empty state + "all done" celebration
- `focus/focus-mode-view.tsx` — Distraction-free focus view: DailyQuestCard hero + flat quick-win task list (≤15 min), full completion flow (confetti, coins, level-up, achievements), "all done" celebration, empty state; combines dashboard quest logic with FiveMinuteView task management pattern
- `layout/coin-counter.tsx` — Animated coin balance in navbar; listens for coinsEarned CustomEvent (delta: +N or -N) to update without full page reload
- `wishlist/wishlist-card.tsx` — Single wishlist item: name, price, coin cost, buy/discard actions
- `wishlist/wishlist-form.tsx` — Create/edit wishlist item modal
- `wishlist/wishlist-view.tsx` — Full wishlist page with budget bar + item grid
- `wishlist/budget-bar.tsx` — Progress bar showing coins spent vs. monthly budget
- `settings/notification-settings.tsx` — Push notification enable/disable/test + daily reminder time + due-today / overdue / recurring-due toggles (all with optimistic save + rollback); receives `vapidPublicKey` as prop from Server Component (not from clientEnv — NEXT_PUBLIC vars are build-time only)
- `settings/linked-accounts.tsx` — Connected OAuth providers list; uses `signIn()` from next-auth/react (not window.location) to trigger linking flow
- `settings/language-switcher.tsx` — UI language switcher (de/en/fr); POSTs to /api/locale
- `settings/delete-account.tsx` — Danger zone: account deletion with confirmation dialog
- `settings/profile-settings.tsx` — Inline profile editor: name, email, avatar upload with preview; PATCHes /api/user/profile; uses next/image for remote URLs, plain img for data URLs (CSP-safe)
- `settings/morning-briefing-settings.tsx` — Morning briefing (daily digest) toggle + time picker; visible when user has ≥1 delivery method; PATCHes /api/push/subscribe with morningBriefingEnabled/morningBriefingTime
- `settings/timezone-settings.tsx` — IANA timezone picker with grouped dropdown (via `Intl.supportedValuesOf('timeZone')`); auto-saves via PATCH /api/settings/timezone; shows browser-detected timezone, mismatch hint, and "Use browser timezone" reset button
- `settings/vacation-mode-settings.tsx` — Vacation mode toggle + end date picker. Inactive state: date input + activate button. Active state: amber info banner with end date + "End now" button. Optimistic UI with success/error messages. PATCHes /api/settings/vacation-mode
- `settings/notification-channels.tsx` — Multi-channel notification settings: list/add/remove/test channels (ntfy.sh, Pushover, Telegram, Email, **Webhook**); inline NtfyForm/PushoverForm/TelegramForm/EmailForm/**WebhookForm** (URL + optional HMAC signing checkbox + secret field); WebhookConfigSummary shows truncated URL; toggle enable/disable per channel; props `emailAvailable` + `defaultEmailAddress` thread instance SMTP config + account email from the Server Component, hiding the "+ Email" button when SMTP is unset
- `settings/notification-history.tsx` — Client component: fetches and displays last 50 notification delivery attempts from GET /api/settings/notification-history. Table/list with channel badge (icon + label), title, timestamp (relative), status badge (green sent / red failed). Failed entries expand on click to show error message. Refresh button, loading skeleton, empty state
- `settings/quest-settings.tsx` — Slider to configure daily quest postpone limit (1–5, default 3)
- `settings/emotional-closure-settings.tsx` — Toggle (An/Aus) to enable/disable affirmation/quote after daily quest completion; PATCHes /api/settings/quest
- `settings/security-section.tsx` — Two-factor authentication (TOTP) settings panel. Disabled state: enable-button hint. Enabled state: active-since label, unused backup-code count, regenerate/disable actions (both require re-entering a current 6-digit code). Hides the disable button entirely when REQUIRE_2FA is set on the instance (plus italic explanation) — server also enforces via 403 TOTP_REQUIRED_BY_ADMIN
- `settings/passkeys-section.tsx` — WebAuthn/Passkey settings panel rendered under SecuritySection. Empty state: hint + "Register a passkey" button. Populated state: list of registered credentials with name (inline editable via Rename), device type badge (Synced / Device-bound), last-used date, and a Remove button. Registration uses `startRegistration()` from `@simplewebauthn/browser`; a `window.prompt()` collects a user-supplied display name (default derived from `navigator.userAgent`). Hides the Remove button on the user's *last* remaining second factor when REQUIRE_2FA=true and no TOTP — server also enforces via 403 SECOND_FACTOR_REQUIRED_BY_ADMIN
- `settings/totp-setup-wizard.tsx` — Two-step setup modal: (1) QR code + manual entry key from `/api/auth/2fa/setup`, (2) first-code verification via `/api/auth/2fa/verify-setup`. Uses a plain `<img>` for the QR data URL (CSP already allows `img-src data:`). Passes the freshly issued backup codes up to the parent via `onComplete`
- `settings/backup-codes-display.tsx` — Read-only 2-column grid of backup codes with copy-to-clipboard and download-as-.txt. Used both at the end of the setup wizard and after a code regeneration; plaintext is never refetched
- `auth/totp-verify-form.tsx` — Second-factor input on `/login/2fa`: 6-digit numeric input with auto-submit on the sixth digit, toggle to 10-character alphanumeric backup-code mode. Calls `/api/auth/2fa/verify`, hard-navigates to /dashboard on success so the layout gate re-runs server-side
- `auth/forced-totp-setup.tsx` — Wraps TotpSetupWizard for the REQUIRE_2FA hard-lock page at `/setup/2fa`. No cancel path — after successful setup, renders the backup codes inline and demands an explicit "I have stored them safely" checkbox before the Continue button unlocks
- `auth/passkey-login-button.tsx` — Passwordless primary-login button rendered above the OAuth providers on `/login`. Calls `POST /api/auth/passkey/login/options` → `startAuthentication()` → `POST /api/auth/passkey/login/verify` → hard-navigates to `/dashboard` so Server Components re-run with the newly set Auth.js session cookie
- `auth/passkey-second-factor-button.tsx` — Passkey challenge button shown on `/login/2fa` as alternative (or sole option) alongside/instead of the TOTP code input. Calls `POST /api/auth/passkey/second-factor/{options,verify}` — on success, marks the existing session row as second-factor-verified, then hard-navigates to `/dashboard`
- `onboarding/onboarding-wizard.tsx` — Main 4-step onboarding wizard shell. State machine: welcome → topic → tasks → notifications. Framer Motion step transitions (slide + spring). On finish calls POST /api/onboarding/complete then redirects to /dashboard. Every step skippable
- `onboarding/onboarding-progress.tsx` — 4-dot progress indicator with animated active dot (amber) and completed dots (green). Framer Motion scale + color transitions
- `onboarding/steps/welcome-step.tsx` — Step 1: four concept cards (Daily Quest, Energy, Coins, Streaks) with staggered entrance animation. FA icons, color-coded backgrounds
- `onboarding/steps/create-topic-step.tsx` — Step 2: simplified inline topic creation form (title + IconPicker + color swatches). Calls POST /api/topics, auto-advances to tasks step on success
- `onboarding/steps/add-tasks-step.tsx` — Step 3: quick-add tasks with Enter shortcut. AnimatePresence for add/remove. Shows "skipped" message if no topic was created
- `onboarding/steps/notification-step.tsx` — Step 4: timezone auto-detection + web push toggle. Gracefully degrades for unsupported/denied browsers
- `shared/search-filter-bar.tsx` — Reusable search input + filter chip bar; used on Tasks and Wishlist pages; follows LanguageSwitcher chip pattern (amber active, elevated inactive)
- `api-keys/api-keys-view.tsx` — API key management (create form, one-time key display, revoke)
- `animations/confetti.tsx` — Confetti burst on task completion / level-up
- `animations/achievement-toast.tsx` — Toast overlay when an achievement is unlocked
- `animations/level-up-overlay.tsx` — Full-screen overlay animation on level-up
- `animations/emotional-closure.tsx` — Affirmation/quote shown after daily quest completion; day-based deterministic pick (same quote all day), Framer Motion fade-in, Lora italic; 12 quotes per language via closure.quote_N i18n keys

## Patterns
- Use CSS variables from `globals.css` for all colors (never hardcode hex)
- Dark and light mode must work for every component (`data-theme` attribute on `<html>`)
- Framer Motion for complex animations; CSS-only for simple hover/focus states
- Fonts: `--font-display` (Lora) for headings, `--font-body` (JetBrains Mono) for task text, `--font-ui` (DM Sans) for UI
- Responsive: test at 375px and 1280px minimum
