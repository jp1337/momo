# lib/

## Purpose
All server-side business logic and infrastructure. API routes import from here — no business logic lives in routes or components.

## Contents
- `auth.ts` — Auth.js v5 config: providers (GitHub, Discord, Google, optional OIDC), Drizzle adapter, session strategy
- `env.ts` — Zod-validated env wrapper. **All** env var access must go through `serverEnv` or `clientEnv` exports here
- `db/index.ts` — Drizzle client (postgres driver), singleton pattern
- `db/schema.ts` — All table definitions: users, topics, tasks, task_completions, wishlist_items, achievements, user_achievements + Auth.js tables (accounts, sessions, verification_tokens)
- `tasks.ts` — getUserTasks, getTaskById, createTask, updateTask, deleteTask, completeTask (coin award + recurring auto-reset), uncompleteTask
- `topics.ts` — getUserTopics (with task counts), getTopicById (with tasks), createTopic, updateTopic, deleteTopic (reassigns tasks to null)
- `validators/index.ts` — Zod schemas: CreateTaskInput, UpdateTaskInput, CreateTopicInput, UpdateTopicInput, CreateWishlistItemInput, UpdateWishlistItemInput
- `daily-quest.ts` — selectDailyQuest: picks today's task (priority: overdue → high-priority topic subtask → recurring → random)
- `gamification.ts` — awardCoins, deductCoins, checkAchievements, getLevelFromXP — coin/XP/achievement logic
- `push.ts` — savePushSubscription, sendPushNotification, sendStreakReminder — Web Push via VAPID
- `rate-limit.ts` — In-memory rate limiter (sliding window) applied to mutation API routes
- `wishlist.ts` — getUserWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem, buyWishlistItem, discardWishlistItem
- `api-keys.ts` — generateApiKey (256-bit), createApiKey, listApiKeys, revokeApiKey, resolveApiKeyUser
- `api-auth.ts` — resolveApiUser() — Bearer Token + Session Cookie, readonlyKeyResponse()
- `openapi.ts` — Full OpenAPI 3.1.0 specification object (served at /api/openapi.json)
- `statistics.ts` — getUserStatistics(userId), getAdminStatistics() — aggregated stats for /stats and /admin pages
- `export.ts` — buildUserExport(userId) — GDPR data export (all user data as JSON)
- `users.ts` — deleteUser(userId) — full account deletion cascade
- `utils/crypto.ts` — Cryptographic helpers (e.g. CRON_SECRET constant-time comparison)

## Patterns
- Business logic functions go directly in `lib/` (e.g. `lib/tasks.ts`, `lib/daily-quest.ts`)
- Every exported function gets a JSDoc comment
- DB queries use Drizzle ORM — no raw SQL strings
- Always filter by `userId` from session to scope data per user
