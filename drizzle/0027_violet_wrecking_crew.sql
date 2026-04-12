CREATE TYPE "public"."recurrence_type" AS ENUM('INTERVAL', 'WEEKDAY', 'MONTHLY', 'YEARLY');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_type" "recurrence_type" DEFAULT 'INTERVAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_weekdays" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_fixed" boolean DEFAULT false NOT NULL;