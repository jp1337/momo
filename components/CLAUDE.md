# components/

## Purpose
UI components. Dumb by design — receive props, render UI, emit events upward. No business logic, no direct DB access.

## Contents
- `theme-toggle.tsx` — Cycles dark → light → system using next-themes
- `layout/navbar.tsx` — Top bar: app name (Lora font), ThemeToggle, user avatar, sign-out
- `layout/sidebar.tsx` — Left navigation with active route highlighting
- `ui/` — shadcn/ui base components (Button, Card, etc.) — heavily customized to use CSS variables

## Patterns
- Use CSS variables from `globals.css` for all colors (never hardcode hex)
- Dark and light mode must work for every component (`data-theme` attribute on `<html>`)
- Framer Motion for complex animations; CSS-only for simple hover/focus states
- Fonts: `--font-display` (Lora) for headings, `--font-body` (JetBrains Mono) for task text, `--font-ui` (DM Sans) for UI
- Responsive: test at 375px and 1280px minimum
