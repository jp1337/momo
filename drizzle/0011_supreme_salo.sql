CREATE TYPE "public"."energy_level" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "energy_level" "energy_level";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "energy_level" "energy_level";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "energy_level_date" date;