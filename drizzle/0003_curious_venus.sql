ALTER TABLE "tasks" ADD COLUMN "postpone_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimated_minutes" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "quest_postpones_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "quest_postponed_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "quest_postpone_limit" integer DEFAULT 3 NOT NULL;