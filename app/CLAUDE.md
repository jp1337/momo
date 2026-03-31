# app/

## Purpose
Next.js 15 App Router pages and API routes. Thin layer — validates input, calls `lib/` functions, returns responses.

## Structure
```
(app)/          → Route group: authenticated app shell
  layout.tsx    → Auth guard (redirects to /login if no session) + Navbar/Sidebar
  dashboard/    → Daily Quest hero card + stats
  tasks/        → Task list and management
  topics/       → Topics + subtasks
  wishlist/     → Wishlist + budget tracker
(auth)/         → Route group: unauthenticated
  layout.tsx    → Centered layout for auth pages
  login/        → OAuth provider buttons (GitHub, Discord, Google)
api/
  auth/[...nextauth]/route.ts  → Auth.js v5 handler (GET + POST)
  tasks/route.ts               → GET (list, ?topicId/type/completed filters), POST (create)
  tasks/[id]/route.ts          → GET (single), PATCH (update), DELETE
  tasks/[id]/complete/route.ts → POST (complete + award coins), DELETE (uncomplete + refund)
  topics/route.ts              → GET (list with task counts), POST (create)
  topics/[id]/route.ts         → GET (with tasks), PATCH, DELETE
globals.css     → Design system CSS variables, Tailwind v4, Google Fonts
layout.tsx      → Root layout: ThemeProvider (next-themes), font variables
page.tsx        → Redirects / → /dashboard
```

## Patterns
- Route groups `(app)` and `(auth)` don't affect URL paths
- API routes: always auth-check first, validate with Zod, call lib function, return `{ data }` or `{ error: string }`
- Server Components by default; add `"use client"` only when needed (interactivity, hooks)
- New API routes get a JSDoc block describing method, auth, body, response
