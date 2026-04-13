# Automated Tests

Momo uses **Vitest** for integration tests against a real PostgreSQL database.
The tests cover the three most critical business-logic functions:
`completeTask`, `selectDailyQuest`, and `updateStreak`.

---

## Prerequisites

- Docker Desktop running (or a local PostgreSQL 15+ instance)
- The `momo` PostgreSQL user exists (created by `docker compose up db`)

---

## First-time setup

```bash
# 1. Start the database
docker compose up db -d

# 2. Run the tests — the test runner will automatically:
#    - Create the momo_test database (if it doesn't exist)
#    - Apply all migrations
#    - Seed achievement definitions
#    - Clean data between tests
npm test
```

The test database is separate from the development database (`momo` vs `momo_test`).
Your development data is never touched.

---

## Running tests

```bash
# Run all tests once (CI mode)
npm test

# Watch mode — re-runs on file changes
npm run test:watch

# Visual UI (browser dashboard)
npm run test:ui
```

---

## Custom database URL

By default, tests use `postgresql://momo:momo_dev_password@localhost:5432/momo_test`.

Override with the `TEST_DATABASE_URL` environment variable:

```bash
TEST_DATABASE_URL="postgresql://user:pass@host:5432/mytest" npm test
```

---

## Test structure

```
__tests__/
├── helpers/
│   ├── global-setup.ts   # runs once: DB creation + migrations
│   ├── setup.ts          # runs per-file: seed achievements + reset user data
│   ├── db.ts             # resetUserData() helper
│   └── fixtures.ts       # createTestUser / createTestTopic / createTestTask
├── update-streak.test.ts       # 7 tests: streak logic, shield, idempotency
├── select-daily-quest.test.ts  # 12 tests: priority tiers, exclusions, energy
└── complete-task.test.ts       # 10 tests: completion, coins, achievements
```

---

## What is tested

### `updateStreak` (7 tests)
- Idempotent when streak already updated today
- Starts at 1 for a fresh user
- Increments when last completion was yesterday
- Resets when gap is 2+ days and no shield
- Shield saves streak when exactly one day was missed
- Shield not activated when already used this month
- `streakMax` grows when current exceeds previous maximum

### `selectDailyQuest` (12 tests)
- Priority 1: oldest overdue task wins
- Priority 2: HIGH-priority topic subtask beats pool
- Priority 3: due recurring task beats random pool
- Priority 4: fallback to ONE_TIME/DAILY_ELIGIBLE task
- DAILY_ELIGIBLE type included in pool
- Snoozed tasks excluded
- Paused (vacation mode) tasks excluded
- Completed tasks excluded
- Idempotent: existing quest returned without re-selection
- Sequential topic: only first open task is eligible
- Energy preference: matching task preferred
- Energy fallback: returns any task when no match
- Returns null when no eligible tasks

### `completeTask` (10 tests)
- ONE_TIME: `completedAt` is set + task_completions entry created
- RECURRING: `nextDueDate` advances (no `completedAt`)
- Coins awarded correctly
- Double coins for tasks postponed 3+ times
- Streak incremented when last completion was yesterday
- Shield activated on one-day gap
- `first_task` achievement unlocked on first completion
- Error on double-completing a ONE_TIME task
- Error when task belongs to a different user
- Quest streak incremented when `isDailyQuest = true`
- Error on completing a paused (vacation mode) task
