ALTER TABLE "users" ADD COLUMN "morning_briefing_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "morning_briefing_time" time DEFAULT '08:00' NOT NULL;