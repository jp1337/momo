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
- `validators/index.ts` — Zod schemas: CreateTaskInput, UpdateTaskInput, CreateTopicInput, UpdateTopicInput

## Patterns
- Business logic functions go directly in `lib/` (e.g. `lib/tasks.ts`, `lib/daily-quest.ts`)
- Every exported function gets a JSDoc comment
- DB queries use Drizzle ORM — no raw SQL strings
- Always filter by `userId` from session to scope data per user
