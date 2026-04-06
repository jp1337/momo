# lib/

## Purpose
All server-side business logic and infrastructure. API routes import from here — no business logic lives in routes or components.

## Contents
- `auth.ts` — Auth.js v5 config: providers (GitHub, Discord, Google, optional OIDC), Drizzle adapter, session strategy
- `env.ts` — Zod-validated env wrapper. **All** env var access must go through `serverEnv` or `clientEnv` exports here
- `db/index.ts` — Drizzle client (postgres driver), singleton pattern
- `db/schema.ts` — All table definitions: users, topics, tasks, task_completions, wishlist_items, achievements, user_achievements + Auth.js tables (accounts, sessions, verification_tokens)
- `tasks.ts` — getUserTasks, getTaskById, createTask (auto-assigns sortOrder within topic), updateTask, deleteTask, completeTask (coin award + streak + achievements, timezone-aware), uncompleteTask, breakdownTask (assigns sequential sortOrder), snoozeTask (hides task until date, clears isDailyQuest if active), unsnoozeTask, reorderTasks (bulk-updates sortOrder in transaction)
- `topic-icons.ts` — TOPIC_ICONS map of 47 curated FA solid icons + resolveTopicIcon(key) with faFolder fallback
- `topics.ts` — getUserTopics (with task counts), getTopicById (with tasks, ordered by sortOrder ASC), createTopic, updateTopic, deleteTopic (reassigns tasks to null)
- `validators/index.ts` — Zod schemas: CreateTaskInput, UpdateTaskInput, SnoozeTaskInput, EnergyCheckinInput, ReorderTasksInput, CreateTopicInput, UpdateTopicInput, CreateWishlistItemInput, UpdateWishlistItemInput, UpdateProfileInput
- `daily-quest.ts` — selectDailyQuest, getCurrentDailyQuest, postponeDailyQuest (timezone-aware), forceSelectDailyQuest. Energy-aware: pickBestTask prefers tasks matching user's daily energy check-in (soft preference, never blocks selection)
- `gamification.ts` — updateStreak (timezone-aware), getLevelForCoins, checkAndUnlockAchievements, seedAchievements, getUserStats
- `date-utils.ts` — getLocalDateString, getLocalTomorrowString, getLocalYesterdayString — all timezone-aware via Intl.DateTimeFormat("en-CA")
- `push.ts` — savePushSubscription, sendPushNotification, sendStreakReminder, sendWeeklyReviewNotifications — Web Push via VAPID + multi-channel fan-out via lib/notifications.ts
- `notifications.ts` — Multi-channel notification system: NotificationChannel interface, NtfyChannel + PushoverChannel classes, createChannel registry, sendToAllChannels fan-out, sendTestNotification
- `weekly-review.ts` — getWeeklyReview(userId, timezone) — weekly performance summary (completions, postponements, coins, streak, top topics)
- `cron.ts` — Unified cron dispatcher. CRON_JOBS registry + runAllJobs(). Add new periodic jobs here — no Docker/endpoint changes needed
- `rate-limit.ts` — In-memory rate limiter (sliding window) applied to mutation API routes
- `wishlist.ts` — getUserWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem, buyWishlistItem, discardWishlistItem
- `api-keys.ts` — generateApiKey (256-bit), createApiKey, listApiKeys, revokeApiKey, resolveApiKeyUser
- `api-auth.ts` — resolveApiUser() — Bearer Token + Session Cookie, readonlyKeyResponse()
- `openapi.ts` — Full OpenAPI 3.1.0 specification object (served at /api/openapi.json)
- `statistics.ts` — getUserStatistics(userId), getAdminStatistics() — aggregated stats for /stats and /admin pages
- `export.ts` — buildUserExport(userId) — GDPR data export (all user data as JSON)
- `users.ts` — deleteUser(userId) — full account deletion cascade; updateUserProfile(userId, data) — update name/email/avatar; processProfileImage(dataUrl) — resize to 200×200 WebP via Sharp
- `utils/crypto.ts` — Cryptographic helpers (e.g. CRON_SECRET constant-time comparison)
- `client/coin-events.ts` — Client-safe module: `COINS_EARNED_EVENT` const + `dispatchCoinsEarned(delta)` with NaN/Infinity guard. Shared by TaskList, TopicDetailView, DailyQuestCard and CoinCounter.

## Patterns
- Business logic functions go directly in `lib/` (e.g. `lib/tasks.ts`, `lib/daily-quest.ts`)
- Every exported function gets a JSDoc comment
- DB queries use Drizzle ORM — no raw SQL strings
- Always filter by `userId` from session to scope data per user
