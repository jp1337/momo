ALTER TABLE "achievements" ADD COLUMN "rarity" text DEFAULT 'common' NOT NULL;--> statement-breakpoint
ALTER TABLE "achievements" ADD COLUMN "coin_reward" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "achievements" ADD COLUMN "secret" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "quest_streak_current" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "quest_streak_last_date" date;