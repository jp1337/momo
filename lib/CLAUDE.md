# lib/

## Purpose
All server-side business logic and infrastructure. API routes import from here — no business logic lives in routes or components.

## Contents
- `auth.ts` — Auth.js v5 config: providers (GitHub, Discord, Google, optional OIDC), Drizzle adapter, session strategy
- `totp.ts` — Two-factor authentication (TOTP) business logic: generateTotpSetup (secret + QR data URL), verifyTotpCode, enableTotpForUser (verifies first code, encrypts secret, generates 10 backup codes — atomic), disableTotpForUser, regenerateBackupCodes, verifyUserTotpCode, consumeBackupCode (constant-time, single-use), getUserTotpStatus, **userHasSecondFactor** (method-agnostic gate — returns true when the user has TOTP *or* at least one registered passkey; single touchpoint used by every enforcement path), setup-cookie helpers (signSetupToken/verifySetupToken — HMAC-SHA256 with AUTH_SECRET, 10-min TTL, never persisted), session-token helpers (markSessionSecondFactorVerified, isSessionSecondFactorVerified, readSessionTokenFromCookieStore)
- `webauthn.ts` — Passkey (WebAuthn) business logic. Uses `@simplewebauthn/server` directly (no Auth.js Passkey provider, because it would require JWT sessions — Momo keeps DB sessions for revocation). Exports: getRpConfig (reads `WEBAUTHN_RP_ID`/`WEBAUTHN_RP_NAME`, defaults RP ID to the hostname of `NEXT_PUBLIC_APP_URL`), createRegistrationOptions, verifyRegistration (persists to `authenticators`), createDiscoverableLoginOptions (passwordless primary login — empty allowCredentials), createLoginOptionsForUser (2FA flow — allow-list scoped to a user), verifyLogin (looks up credential, verifies, updates counter + lastUsedAt), createPasskeyLoginSession (inserts a fresh `sessions` row with `second_factor_verified_at = now()` because passkeys are inherently MFA), listUserPasskeys / renamePasskey / deletePasskey for the settings UI, and signChallengeToken/verifyChallengeToken (HMAC-SHA256 over `AUTH_SECRET`, 5-min TTL, purpose-tagged `reg`/`login`/`sf` to prevent cross-flow replay — same pattern as `totp.ts::signSetupToken`)
- `env.ts` — Zod-validated env wrapper. **All** env var access must go through `serverEnv` or `clientEnv` exports here
- `db/index.ts` — Drizzle client (postgres driver), singleton pattern
- `db/schema.ts` — All table definitions: users, topics, tasks, task_completions, wishlist_items, achievements, user_achievements, authenticators (WebAuthn/Passkey credentials) + Auth.js tables (accounts, sessions, verification_tokens)
- `validators/passkey.ts` — Zod schemas for the `/api/auth/passkey/*` request bodies (RegistrationResponseJSON + AuthenticationResponseJSON shapes + rename body). Kept in its own file so the bulky WebAuthn types do not pollute `validators/index.ts`
- `tasks.ts` — getUserTasks, getTaskById, createTask (auto-assigns sortOrder within topic), updateTask, deleteTask, completeTask (coin award + streak + achievements, timezone-aware), uncompleteTask, breakdownTask (assigns sequential sortOrder), snoozeTask (hides task until date, clears isDailyQuest if active), unsnoozeTask, reorderTasks (bulk-updates sortOrder in transaction)
- `topic-icons.ts` — TOPIC_ICONS map of 47 curated FA solid icons + resolveTopicIcon(key) with faFolder fallback
- `topics.ts` — getUserTopics (with task counts), getTopicById (with tasks, ordered by sortOrder ASC), createTopic, updateTopic, deleteTopic (reassigns tasks to null)
- `validators/index.ts` — Zod schemas: CreateTaskInput, UpdateTaskInput, SnoozeTaskInput, EnergyCheckinInput, ReorderTasksInput, CreateTopicInput, UpdateTopicInput, CreateWishlistItemInput, UpdateWishlistItemInput, UpdateProfileInput
- `daily-quest.ts` — selectDailyQuest, getCurrentDailyQuest, postponeDailyQuest (timezone-aware), forceSelectDailyQuest. Energy-aware: pickBestTask prefers tasks matching user's daily energy check-in (soft preference, never blocks selection)
- `gamification.ts` — updateStreak (timezone-aware), getLevelForCoins, checkAndUnlockAchievements, seedAchievements, getUserStats
- `date-utils.ts` — getLocalDateString, getLocalTomorrowString, getLocalYesterdayString — all timezone-aware via Intl.DateTimeFormat("en-CA")
- `push.ts` — savePushSubscription, sendPushNotification, sendStreakReminder, sendWeeklyReviewNotifications — Web Push via VAPID + multi-channel fan-out via lib/notifications.ts
- `notifications.ts` — Multi-channel notification system: NotificationChannel interface, NtfyChannel + PushoverChannel + TelegramChannel + EmailChannel classes, createChannel registry, sendToAllChannels fan-out, sendTestNotification, isEmailChannelAvailable (server-side gate based on SMTP_HOST/SMTP_FROM)
- `email-templates.ts` — renderEmailTemplate(payload, appUrl): newsletter-style HTML template (table-based, Outlook-compatible, Lora-heading, Waldgrün-accent, CTA button, footer with settings link); used by EmailChannel.send. Pure function, no side effects
- `weekly-review.ts` — getWeeklyReview(userId, timezone) — weekly performance summary (completions, postponements, coins, streak, top topics)
- `cron.ts` — Unified cron dispatcher. CRON_JOBS registry + runAllJobs(). Add new periodic jobs here — no Docker/endpoint changes needed
- `rate-limit.ts` — In-memory rate limiter (sliding window) applied to mutation API routes
- `wishlist.ts` — getUserWishlistItems, createWishlistItem, updateWishlistItem, deleteWishlistItem, buyWishlistItem, discardWishlistItem
- `api-keys.ts` — generateApiKey (256-bit), createApiKey, listApiKeys, revokeApiKey, resolveApiKeyUser
- `api-auth.ts` — resolveApiUser() — Bearer Token + Session Cookie, readonlyKeyResponse(); resolveVerifiedApiUser() (opt-in 2FA-aware variant — Bearer tokens are exempt; cookie sessions return TOTP_REQUIRED / TOTP_SETUP_REQUIRED if not verified) + verifiedAuthErrorResponse()
- `openapi.ts` — Full OpenAPI 3.1.0 specification object (served at /api/openapi.json)
- `statistics.ts` — getUserStatistics(userId), getAdminStatistics() — aggregated stats for /stats and /admin pages
- `export.ts` — buildUserExport(userId) — GDPR data export (all user data as JSON)
- `users.ts` — deleteUser(userId) — full account deletion cascade; updateUserProfile(userId, data) — update name/email/avatar; processProfileImage(dataUrl) — resize to 200×200 WebP via Sharp
- `utils/crypto.ts` — Cryptographic helpers: timingSafeEqual (constant-time string compare), encryptSecret/decryptSecret (AES-256-GCM with TOTP_ENCRYPTION_KEY, fresh IV per call, AuthTag separate), hashBackupCode (SHA-256 hex; mirrors api-keys pattern)
- `client/coin-events.ts` — Client-safe module: `COINS_EARNED_EVENT` const + `dispatchCoinsEarned(delta)` with NaN/Infinity guard. Shared by TaskList, TopicDetailView, DailyQuestCard and CoinCounter.

## Patterns
- Business logic functions go directly in `lib/` (e.g. `lib/tasks.ts`, `lib/daily-quest.ts`)
- Every exported function gets a JSDoc comment
- DB queries use Drizzle ORM — no raw SQL strings
- Always filter by `userId` from session to scope data per user
