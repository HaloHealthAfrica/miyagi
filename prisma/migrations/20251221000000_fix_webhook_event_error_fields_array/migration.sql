-- Fix: Prisma does not support optional list fields (String[]?)
-- Ensure WebhookEvent.error_fields is non-null with default empty array.

UPDATE "WebhookEvent"
SET "error_fields" = ARRAY[]::text[]
WHERE "error_fields" IS NULL;

ALTER TABLE "WebhookEvent"
ALTER COLUMN "error_fields" SET DEFAULT ARRAY[]::text[];

ALTER TABLE "WebhookEvent"
ALTER COLUMN "error_fields" SET NOT NULL;


