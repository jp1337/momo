# Outreach Drafts

Ready-to-post copy for backlink-building outreach. Each draft is meant
to be copy-pasted with light personalization (a screenshot here, a
sentence there) before publishing.

Strategy and full target list lives in [ROADMAP.md](../ROADMAP.md)
under "Verbreiten". This file is just the writing.

---

## 1. r/selfhosted Showcase Post

**Subreddit:** [r/selfhosted](https://www.reddit.com/r/selfhosted/) (~540k members)

**Best time to post:** Mon/Tue/Wed 7–10 UTC (= 8–11 CET, before US lunch)

**Title:**

> Momo: a self-hosted task manager I built for ADHD/procrastination — one quest per day instead of endless lists

**Body:**

```markdown
Hey r/selfhosted,

I've been working on Momo for the last few months — a self-hosted task
manager designed around a single idea: pick **one** task per day, do
that, done.

I built it for myself first. I have ADHD and every traditional task
manager (Todoist, TickTick, Things) ended up making my procrastination
worse — long lists, six fields per task, prioritization paralysis. I
wanted something where the app does the picking and I just do the doing.

**What's in it:**
- Daily Quest: one task per day, picked based on priority + your daily
  energy check-in
- Gamification: coins, levels, streaks, achievements — but tied to a
  built-in wishlist so coins translate to real things you save up for
- Habit tracker with GitHub-style year heatmap
- Recurring tasks (interval / weekday / monthly / yearly)
- Multi-channel notifications: Web Push, Email (SMTP), ntfy.sh,
  Pushover, Telegram, generic webhooks
- Two-factor auth (TOTP + Passkeys / WebAuthn)
- Calendar feed (iCal subscription URL) for syncing into Apple/Google/
  Outlook
- Full REST API + OpenAPI spec
- 7 languages: German, English, French, Spanish, Dutch, Russian, Chinese
- PWA, installable on mobile and desktop

**Self-hosting story:**
- Docker Compose, single command up
- PostgreSQL 16 (also in the compose file)
- Optional opt-in pg_dump backup service via `BACKUP_ENABLED=true`
- ~200 MB final image, runs fine on a Raspberry Pi 4
- Free under MIT, no premium tier, no telemetry

**Quick start:**
```
git clone https://github.com/jp1337/momo
cd momo
cp .env.example .env  # edit AUTH_SECRET, DATABASE_URL, OAuth
docker compose up -d
```

Live demo (my own instance): https://momotask.app
Source: https://github.com/jp1337/momo
Docs: https://jp1337.github.io/momo

Happy to answer questions and would love feedback from anyone who
self-hosts task managers — what's missing, what's stupid, what would
you change.
```

**Tips:**
- Add 1–2 screenshots to the top of the post (Reddit allows up to 20
  images). Most important shot: Dashboard with Daily Quest visible.
- Be active in the comments for the first hour after posting — Reddit's
  ranking weights early engagement heavily.
- If someone compares Momo to Todoist, answer honestly. Don't diss
  Todoist; explain why a different design fit your brain better.

---

## 2. Show HN

**Site:** [Hacker News](https://news.ycombinator.com/submit)

**Best time to post:** Sunday evening US Pacific (= Monday 04:00–06:00
CET) or Monday early morning US East. Avoid Friday afternoon.

**Title:**

> Show HN: Momo – self-hosted task manager designed for ADHD and procrastination

**Body (the "url" field gets the live demo, the "text" field gets this):**

```markdown
Hi HN, I built Momo because every existing task manager made my own
procrastination worse — too many fields, too many decisions before I
could actually start a task.

The premise: instead of showing you a list of 50 things, the app picks
one task per day based on priority + your current energy level. You do
that one thing, earn coins toward a built-in wishlist, build a streak.
Everything else (habits, achievements, weekly review) is supporting
infrastructure, not the main interaction.

Stack: Next.js 16, PostgreSQL 16, Drizzle ORM, Auth.js v5, Radix UI
primitives. ~1700 tests, GitHub CI green. Self-hostable via Docker
Compose; my own instance runs on a single VPS.

Free under MIT, no premium tier. Built solo over a few months as an
exercise in actually finishing one of my projects (which I think is
working — Momo got finished and shipped).

Live: https://momotask.app
Code: https://github.com/jp1337/momo

Would especially appreciate feedback on the energy-aware scheduling
(tag tasks with HIGH/MEDIUM/LOW required energy, check in daily, get
matched tasks) — this is the most opinionated part and I'm not sure
yet if it pays off in practice or if it's overengineering.
```

**Tips:**
- Within the first hour after posting, watch the comment thread and
  respond to everything. HN ranking weighs early engagement and active
  authors a lot.
- If the post hits the front page, expect a traffic spike — make sure
  momotask.app is up and the registration flow works.
- HN tolerates an honest "I built this" tone but hates marketing-speak.
  No "revolutionary", no "next-gen", no "blazingly fast" unless it
  literally is.

---

## 3. dev.to Engineering Article

**Site:** [dev.to](https://dev.to/new)

**Best time to publish:** Tue or Thu morning US East. dev.to also
crossposts to Mastodon if you enable it — bonus reach.

**Title:**

> Migrating 5 React modals to Radix UI primitives without losing the design language

**Sub-title:**

> What I learned wrapping Radix in a thin themed Dialog component

**Tags:** `#react`, `#nextjs`, `#typescript`, `#accessibility`, `#opensource`

**Outline (1500–2500 words when filled out):**

```markdown
## The setup

Brief intro: I built [Momo](https://github.com/jp1337/momo), a
self-hosted task manager (1-sentence what-it-is). Started with custom
React components for everything: 5 modals, 3 dropdown menus, 1 popover.

The pain point: no focus trap, no body scroll lock, manual outside-click
handlers everywhere, ARIA semantics inconsistent. Every component
reinvented the same patterns.

Decided to migrate to Radix UI primitives — but wanted to keep the
visual identity (dark forest theme, Lora display font, custom CSS
variables). Spoiler: the migration was a clean win.

## Why not shadcn/ui

shadcn ships with its own design tokens (--primary, --secondary, etc.).
Would have meant either rewriting every existing component to use those
tokens, or running a mixed system. Both bad.

Radix UI alone gives the accessibility wins without the design opinion.
You bring your own styling.

## The wrapper pattern

\`\`\`tsx
// components/ui/dialog.tsx
import * as RadixDialog from "@radix-ui/react-dialog";

export const Dialog = RadixDialog.Root;

export function DialogContent({ title, description, size = "md", children }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />
      <RadixDialog.Content style={{ backgroundColor: "var(--bg-surface)", ... }}>
        <RadixDialog.Title>{title}</RadixDialog.Title>
        {description && <RadixDialog.Description>{description}</RadixDialog.Description>}
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
\`\`\`

Key insight: keep Radix imports namespaced (`* as RadixDialog`), expose
only what you actually use, hardcode the styling that matches your
design system. ~120 lines of wrapper code unlocks accessibility for
every modal in the app.

## What I gained for free

- Focus trap (Tab cycles within modal)
- Body scroll lock when modal is open
- Esc-to-close
- Outside-click-to-close (configurable)
- Portal rendering (no z-index wars)
- ARIA labels and roles correct by default

## Edge cases that bit me

**TaskBreakdownModal — open-state mismatch:** Parent controls mounting
via `{showModal && <Modal/>}`, but Radix manages open state via the
`open` prop. Two options:
1. Refactor every parent to use a persistent mount + open state
2. Pass `open={true}` and handle close-via-prop in onOpenChange to call
   the existing `onCancel`

I went with option 2 to keep the migration small. Code looks like:

\`\`\`tsx
<Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
\`\`\`

**QuickAddModal — global keyboard shortcut + custom positioning:** This
modal has a global N-key shortcut and lives at top-of-screen instead of
centered. Used Radix primitives directly (not the wrapper) to keep the
custom position. The wrapper is for the common case; primitives are
there when you need them.

## Bonus: the same pattern for DropdownMenu, Popover, Tooltip, ToggleGroup

After Dialog worked, migrated 4 more primitive types in 1 day each:
- `react-dropdown-menu` → UserMenu, BulkActionBar (3 dropdowns total)
- `react-popover` → IconPicker (which had no keyboard nav before)
- `react-tooltip` → replaces native `title=` attributes (faster, themed)
- `react-toggle-group` → segmented controls (postpone limit, energy
  picker) get arrow-key navigation and roving tabindex for free

Total project impact:
- Migrated 13 components
- Removed ~200 lines of custom focus/click-outside/escape boilerplate
- Added ~400 lines of thin wrappers
- Net: more code, but the new code is just configuration, not logic.

## Result

- 0 lines of custom focus-trap code
- 0 lines of custom outside-click handlers across the project
- Every modal in the app now has correct ARIA semantics
- The design language did not change. At all.

If you want to see the production code:
- Wrappers: https://github.com/jp1337/momo/tree/main/components/ui
- Live demo: https://momotask.app
- Repo: https://github.com/jp1337/momo
```

**Tips:**
- Include 1 hero image at the top (a side-by-side of "before/after" or a
  simple modal screenshot)
- Include real code snippets — dev.to readers expect them
- Add a CTA at the end: "Star the repo if useful" or "PRs welcome"
- After publishing, share the article URL in r/reactjs, r/nextjs,
  Hacker News (as a regular submit, not Show HN)

---

## 4. r/opensource (short post)

**Subreddit:** [r/opensource](https://www.reddit.com/r/opensource/)

**Title:**

> Momo — open-source task manager (MIT) for people with procrastination tendencies

**Body:**

```markdown
Built and released Momo, a self-hostable task manager designed around
"one task per day" instead of endless lists. MIT licensed, ~1700 tests,
7 languages.

Demo: https://momotask.app
Code: https://github.com/jp1337/momo

Stack: Next.js 16, PostgreSQL, Drizzle ORM, Radix UI. Single Docker
Compose command to spin up.

Particularly looking for contributors interested in:
- Native speaker review for Russian and Chinese translations (currently
  AI-assisted)
- Additional notification channel integrations
- Mobile UX improvements

CONTRIBUTING.md and good-first-issues are tagged on GitHub.
```

---

## Suggested timing & order

| When | Where | Why first |
|------|-------|-----------|
| Week 1 (Mon/Tue/Wed AM CET) | r/selfhosted | Largest receptive audience, lowest risk |
| Week 2 (Sun PM Pacific) | Show HN | Bigger spike potential, harder to land |
| Week 3 (Tue or Thu AM US East) | dev.to article | Use feedback from Reddit/HN to sharpen the angle |
| Week 4+ | r/opensource, smaller subs | Spread out, avoid spam pattern |

---

## What you still need before posting

- **2–3 high-quality screenshots** in the new desaturated dark theme:
  - Dashboard with active Daily Quest
  - Task list view with sequential group + stepper visible
  - Stats page with the contribution heatmap
- **Optional but nice:** a small logo/icon for Reddit thumbnail
- **A Reddit account with some karma** — Reddit's spam filter punishes
  brand-new accounts that immediately self-promote. If your account is
  fresh, comment in unrelated threads for a week first.
- **A working momotask.app demo at posting time** — assume traffic spike,
  make sure registration + sign-in works, especially OAuth providers
- **A GitHub release tag visible at the top of the README** — gives
  visitors a clear "where am I" anchor

---

## After the post

- Reply to every comment in the first 2 hours, then daily for a week
- Track inbound traffic via your access logs (no analytics? Plausible
  is self-hostable and would fit Momo's vibe — but install BEFORE the
  post)
- For each meaningful piece of feedback, file a GitHub issue and link
  back to the comment — shows the contributor that their input mattered
- After 1 week, write a short follow-up post: "Update from r/selfhosted
  launch — here's what I learned, here's what I shipped". Reciprocates
  attention and converts curious lurkers into actual users.
