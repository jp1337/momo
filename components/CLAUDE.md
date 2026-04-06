# components/

## Purpose
UI components. Dumb by design — receive props, render UI, emit events upward. No business logic, no direct DB access.

## Contents
- `theme-toggle.tsx` — Cycles dark → light → system using next-themes
- `layout/navbar.tsx` — Top bar: app name (Lora font), ThemeToggle, coin display, user avatar dropdown
- `layout/sidebar.tsx` — Left navigation (hidden on mobile), active route highlighting
- `layout/mobile-nav.tsx` — Fixed bottom tab bar (mobile only, md:hidden): Dashboard/Tasks/Topics/Wishlist
- `layout/user-menu.tsx` — Avatar dropdown: Settings, API Keys, Stats, Admin (if isAdmin), Sign out
- `ui/` — shadcn/ui base components (Button, Card, etc.) — heavily customized to use CSS variables
- `tasks/task-item.tsx` — Single task row: checkbox, Framer Motion completion animation, priority badges, topic tag, due date, estimatedMinutes badge, postponeCount badge, breakdown button, snooze button (clock icon with popover: tomorrow/week/month/custom date), snoozed-until badge
- `tasks/task-form.tsx` — Create/edit modal; fields: title, type, priority, topicId, dueDate, coinValue, estimatedMinutes (5/15/30/60 min), notes, recurrenceInterval
- `tasks/task-list.tsx` — Groups tasks into Today/Upcoming/No Date/Someday/Snoozed/Completed sections; manages client state, fires coinsEarned CustomEvent on complete/uncomplete, sends timezone in complete POST, renders live active/completed subtitle, handles snooze/unsnooze via /api/tasks/:id/snooze
- `tasks/task-breakdown-modal.tsx` — Modal to split a task into 2–5 subtasks inside a new topic; POSTs to /api/tasks/:id/breakdown
- `tasks/due-today-banner.tsx` — Banner shown on tasks page when tasks are overdue or due today
- `topics/topic-card.tsx` — Topic card: FA icon (resolveTopicIcon), color, progress bar (X/Y subtasks), priority badge
- `topics/topic-form.tsx` — Create/edit modal with local FA icon picker (IconPicker) + color swatches; no external emoji CDN
- `topics/topics-grid.tsx` — Responsive grid (1/2/3 cols), handles topic CRUD state
- `topics/topic-detail-view.tsx` — Scoped task list for a single topic; full parity with TaskList (confetti, coin events, level-up, achievements, timezone)
- `topics/icon-picker.tsx` — 6-column FA icon grid picker; used in topic-form instead of emoji-picker
- `dashboard/daily-quest-card.tsx` — Hero card: quest display, postpone (with daily limit counter), celebration state all day after completion; fires coinsEarned event
- `layout/coin-counter.tsx` — Animated coin balance in navbar; listens for coinsEarned CustomEvent (delta: +N or -N) to update without full page reload
- `wishlist/wishlist-card.tsx` — Single wishlist item: name, price, coin cost, buy/discard actions
- `wishlist/wishlist-form.tsx` — Create/edit wishlist item modal
- `wishlist/wishlist-view.tsx` — Full wishlist page with budget bar + item grid
- `wishlist/budget-bar.tsx` — Progress bar showing coins spent vs. monthly budget
- `settings/notification-settings.tsx` — Push notification enable/disable/test; receives `vapidPublicKey` as prop from Server Component (not from clientEnv — NEXT_PUBLIC vars are build-time only)
- `settings/linked-accounts.tsx` — Connected OAuth providers list; uses `signIn()` from next-auth/react (not window.location) to trigger linking flow
- `settings/language-switcher.tsx` — UI language switcher (de/en/fr); POSTs to /api/locale
- `settings/delete-account.tsx` — Danger zone: account deletion with confirmation dialog
- `settings/quest-settings.tsx` — Slider to configure daily quest postpone limit (1–5, default 3)
- `shared/search-filter-bar.tsx` — Reusable search input + filter chip bar; used on Tasks and Wishlist pages; follows LanguageSwitcher chip pattern (amber active, elevated inactive)
- `api-keys/api-keys-view.tsx` — API key management (create form, one-time key display, revoke)
- `animations/confetti.tsx` — Confetti burst on task completion / level-up
- `animations/achievement-toast.tsx` — Toast overlay when an achievement is unlocked
- `animations/level-up-overlay.tsx` — Full-screen overlay animation on level-up

## Patterns
- Use CSS variables from `globals.css` for all colors (never hardcode hex)
- Dark and light mode must work for every component (`data-theme` attribute on `<html>`)
- Framer Motion for complex animations; CSS-only for simple hover/focus states
- Fonts: `--font-display` (Lora) for headings, `--font-body` (JetBrains Mono) for task text, `--font-ui` (DM Sans) for UI
- Responsive: test at 375px and 1280px minimum
