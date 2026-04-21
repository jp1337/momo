# Automated Tests

Momo uses **Vitest** for integration tests against a real PostgreSQL database.
The suite covers the complete `lib/` layer: daily quest selection, task CRUD,
mutations, topics, wishlist, energy check-ins, sessions, API keys, calendar
feeds, weekly review, gamification, habit streaks, vacation mode, and user
account management.

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
│   ├── global-setup.ts              # runs once: DB creation + migrations
│   ├── setup.ts                     # runs per-file: seed achievements + reset user data
│   ├── db.ts                        # resetUserData() helper
│   └── fixtures.ts                  # createTestUser / createTestTopic / createTestTask / createTestWishlistItem / createTestApiKey
├── api-keys.test.ts                 # 13 tests: generateApiKey, createApiKey, listApiKeys, revokeApiKey, resolveApiKeyUser
├── calendar.test.ts                 # 15 tests: token CRUD, ICS format, UID, RRULE
├── complete-task.test.ts            # 10 tests: completion, coins, achievements
├── daily-quest-mutations.test.ts    # 22 tests: postpone, force-select, energy reselect, pin
├── date-utils.test.ts               # 17 tests: getLocalDateString, getLocalTomorrowString, getLocalYesterdayString, getLocalDayBeforeYesterdayString
├── energy.test.ts                   # 13 tests: recordEnergyCheckin, history, counts, streak
├── gamification-extras.test.ts      # 21 tests: levels, getUserStats, achievements
├── habit-streak.test.ts             # 25 tests: computeHabitStreak (pure function, no DB)
├── notification-log.test.ts         # 4 tests: cleanupNotificationLog — deletes old, keeps recent, user isolation
├── select-daily-quest.test.ts       # 13 tests: priority tiers, exclusions, energy
├── sessions.test.ts                 # 13 tests: extractIp, parseUserAgent, listUserSessions, revokeSession
├── task-crud.test.ts                # 20 tests: getUserTasks, getTaskById, createTask, updateTask, deleteTask
├── task-mutations.test.ts           # 31 tests: uncomplete, snooze, bulk, reorder, breakdown
├── topics.test.ts                   # 14 tests: getUserTopics, getTopicById, createTopic, updateTopic, deleteTopic
├── update-streak.test.ts            # 7 tests: streak logic, Cassiopeia, idempotency
├── users.test.ts                    # 8 tests: deleteUser (cascade), updateUserProfile (EMAIL_TAKEN)
├── vacation-mode.test.ts            # 15 tests: activate, deactivate, auto-end
├── email-template.test.ts           # 14 tests: renderEmailTemplate — HTML structure, XSS escaping, CTA link, footer
├── export.test.ts                   # 10 tests: exportUserData — shape, user isolation, not-found error
├── habits-db.test.ts                # 18 tests: getHabitsWithHistory, getEarliestCompletion, buildYearOptions, computeHabitStreak
├── onboarding.test.ts               # 6 tests: markOnboardingCompleted, isOnboardingCompleted
├── rate-limit.test.ts               # 8 tests: checkRateLimit — fixed window, key isolation, window expiry
├── statistics.test.ts               # 20 tests: computeStreakHistory (pure), getUserStatistics (coinsEarnedAllTime value, completionsByWeekday index), getAdminStatistics
├── templates.test.ts                # 18 tests: getTemplate (pure), importTopicFromTemplate
├── totp.test.ts                     # 35 tests: generateTotpSetup, verifyTotpCode, enableTotpForUser, disableTotpForUser,
│                                    #           regenerateBackupCodes, consumeBackupCode (single-use), getUserTotpStatus,
│                                    #           userHasSecondFactor, signSetupToken/verifySetupToken, readSessionTokenFromCookieStore
├── webhooks.test.ts                 # 22 tests: listWebhookEndpoints, createWebhookEndpoint (limit), updateWebhookEndpoint (secret semantics),
│                                    #           deleteWebhookEndpoint, listWebhookDeliveries, cleanupWebhookDeliveries
├── weekly-review.test.ts            # 8 tests: completions, coins, streak, postponementsThisWeek, top topics, user isolation
└── wishlist.test.ts                 # 18 tests: CRUD, markAsBought, unmarkAsBought, getBudgetSummary
```

**Total: 491 tests across 28 files.**

---

## What is tested

### `updateStreak` (7 tests)
- Idempotent when streak already updated today
- Starts at 1 for a fresh user
- Increments when last completion was yesterday
- Resets when gap is 2+ days and no Cassiopeia available
- Cassiopeia saves streak when exactly one day was missed
- Cassiopeia not activated when already used this month
- `streakMax` grows when current exceeds previous maximum

### `selectDailyQuest` (13 tests)
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
- Energy preference: explicitly-tagged matching task preferred
- Energy fallback: returns any task when no exact match
- Returns null when no eligible tasks

### `completeTask` (10 tests)
- ONE_TIME: `completedAt` is set + task_completions entry created
- RECURRING: `nextDueDate` advances (no `completedAt`)
- Coins awarded correctly
- Double coins for tasks postponed 3+ times
- Streak incremented when last completion was yesterday
- Cassiopeia activated on one-day gap
- `first_task` achievement unlocked on first completion
- Error on double-completing a ONE_TIME task
- Error when task belongs to a different user
- Quest streak incremented when `isDailyQuest = true`
- Error on completing a paused (vacation mode) task

### `postponeDailyQuest`, `forceSelectDailyQuest`, `reselectQuestForEnergy`, `pinTaskAsDailyQuest` (22 tests)
- Postpone: clears `isDailyQuest`, sets `snoozedUntil = tomorrow`, increments counter
- Postpone: inserts `questPostponements` analytics row
- Postpone: daily counter resets on a new day
- Postpone: throws `LIMIT_REACHED` when limit exhausted
- Force-select: returns null when no eligible tasks
- Force-select: clears old quest before selecting new one
- Force-select: HIGH-priority topic subtask preferred via tier 2
- Force-select: prefers energy-matching tasks when energy provided
- Energy reselect: no-op when quest is completed / untagged / already matching
- Energy reselect: swaps quest when energy mismatches and better candidate exists
- Energy reselect: keeps current quest when no better candidate
- Pin: sets new quest, clears old one
- Pin: returns null for wrong user / completed / snoozed-past-today tasks

### `uncompleteTask`, `snoozeTask`, `unsnoozeTask`, `bulkUpdateTasks`, `reorderTasks`, `promoteTaskToTopic`, `breakdownTask` (31 tests)
- Uncomplete: clears `completedAt`, deletes most recent completion record
- Uncomplete: deducts coins (GREATEST clamp — never goes negative)
- Uncomplete: throws for RECURRING tasks / non-completed tasks
- Snooze: sets `snoozedUntil`, clears `isDailyQuest` if active quest
- Snooze: throws for completed tasks / wrong user
- Unsnooze: clears `snoozedUntil`, throws for wrong user
- Bulk delete: removes specified tasks, ignores other users' tasks
- Bulk complete: marks ONE_TIME tasks done, skips RECURRING and already-completed
- Bulk changeTopic: moves tasks to topic (or null to remove), validates topic ownership
- Bulk setPriority: updates priority on all specified tasks
- Reorder: updates `sortOrder` to match array index
- Reorder: throws when a task id doesn't belong to the topic
- PromoteToTopic: creates topic from task, throws if already in a topic
- Breakdown: creates topic + N subtasks, deletes original, increments `totalTasksCreated`
- Recurrence (WEEKDAY/MONTHLY/YEARLY): correct `nextDueDate` computation + Feb-28 clamping

### `computeHabitStreak` (25 tests, pure function — no DB)
- INTERVAL: consecutive periods build streak, gap resets it
- INTERVAL: multiple completions in one period collapse to single hit
- INTERVAL: paused period counts as ok (no break)
- WEEKDAY: grace rule — period 0 empty starts counting from period 1
- WEEKDAY: 2-week streak, missed week resets, best streak across runs
- MONTHLY: grace rule, 2-month and 6-month streaks, missed month resets
- YEARLY: grace rule, 3-year streak
- Paused ranges: covered period marked ok in all three calendar types
- Edge cases: empty completions → 0, empty/undefined paused ranges

### `getVacationStatus`, `activateVacationMode`, `deactivateVacationMode`, `autoEndVacations` (15 tests)
- Status: returns `active: false` with no vacation, `active: true` with end date
- Activate: sets `vacationEndDate` on user
- Activate: pauses RECURRING tasks (`pausedAt`, `pausedUntil`), skips ONE_TIME / completed
- Activate: clears `isDailyQuest` on the paused quest task
- Deactivate: clears `vacationEndDate`, clears `pausedAt/pausedUntil`
- Deactivate: shifts `nextDueDate` forward by actual pause days
- Deactivate: never sets `nextDueDate` to a past date
- AutoEnd: deactivates users whose `vacationEndDate < today` (in their TZ)
- AutoEnd: leaves users whose end date is today or in the future untouched

### `getLevelForCoins`, `getNextLevel`, `getUserStats`, `checkAndUnlockAchievements` (21 tests)
- Level boundaries for all 10 levels (0→1, 50→2, …, 3000→10)
- Level titles match definitions; `getNextLevel` returns null at max
- `getUserStats`: correct coins, streak, level, `streakShieldAvailable` logic
  (null → true, current month → false, past month → true)
- Achievements: `first_task` + `streak_3` unlocked at correct thresholds
- Duplicate-unlock guard: already-earned achievements not re-inserted
- `coinsAwarded` matches sum of newly unlocked achievement rewards
- No-op when no thresholds are met
