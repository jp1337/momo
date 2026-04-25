ALTER TABLE "push_subscriptions" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;