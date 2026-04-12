-- overdue_reminder_enabled may already exist (applied out-of-band via 0030_overdue_reminder.sql)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "overdue_reminder_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "due_today_reminder_time" time DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recurring_due_reminder_time" time DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "overdue_reminder_time" time DEFAULT '08:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weekly_review_time" time DEFAULT '18:00' NOT NULL;