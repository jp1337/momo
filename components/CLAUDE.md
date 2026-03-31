# components/

## Purpose
UI components. Dumb by design — receive props, render UI, emit events upward. No business logic, no direct DB access.

## Contents
- `theme-toggle.tsx` — Cycles dark → light → system using next-themes
- `layout/navbar.tsx` — Top bar: app name (Lora font), ThemeToggle, user avatar, sign-out
- `layout/sidebar.tsx` — Left navigation with active route highlighting
- `ui/` — shadcn/ui base components (Button, Card, etc.) — heavily customized to use CSS variables
- `tasks/task-item.tsx` — Single task row: checkbox, Framer Motion completion animation, priority badges, topic tag, due date, recurring/quest indicators
- `tasks/task-form.tsx` — Create/edit modal (client component), shows recurrence interval only when type=RECURRING
- `tasks/task-list.tsx` — Groups tasks into Today & Overdue / Upcoming / No date / Someday / Completed; manages client state after server fetch
- `topics/topic-card.tsx` — Topic card: icon, color, progress bar (X/Y subtasks), priority badge
- `topics/topic-form.tsx` — Create/edit modal with emoji-picker-react picker + color swatches
- `topics/topics-grid.tsx` — Responsive grid (1/2/3 cols), handles topic CRUD state
- `topics/topic-detail-view.tsx` — Scoped task list for a single topic with Add subtask button

## Patterns
- Use CSS variables from `globals.css` for all colors (never hardcode hex)
- Dark and light mode must work for every component (`data-theme` attribute on `<html>`)
- Framer Motion for complex animations; CSS-only for simple hover/focus states
- Fonts: `--font-display` (Lora) for headings, `--font-body` (JetBrains Mono) for task text, `--font-ui` (DM Sans) for UI
- Responsive: test at 375px and 1280px minimum
