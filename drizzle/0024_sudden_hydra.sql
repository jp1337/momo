ALTER TABLE "tasks" ADD COLUMN "paused_at" date;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "paused_until" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "vacation_end_date" date;