ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "onboarding_completed" = true;