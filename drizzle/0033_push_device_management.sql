-- Add per-device name and enabled flag to push_subscriptions.
-- name:    User-assigned or auto-detected device name (nullable).
-- enabled: When false, this subscription is skipped when sending push notifications.
ALTER TABLE "push_subscriptions" ADD COLUMN "name" text;
ALTER TABLE "push_subscriptions" ADD COLUMN "enabled" boolean NOT NULL DEFAULT true;
