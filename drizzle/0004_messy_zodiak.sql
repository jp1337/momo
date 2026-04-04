ALTER TABLE "users" ADD COLUMN "total_tasks_created" integer DEFAULT 0 NOT NULL;

-- Backfill existing users with their current task count as the starting value.
-- This ensures the stat shows a meaningful number for users created before this migration.
UPDATE "users"
SET "total_tasks_created" = (
  SELECT COUNT(*) FROM "tasks" WHERE "tasks"."user_id" = "users"."id"
);