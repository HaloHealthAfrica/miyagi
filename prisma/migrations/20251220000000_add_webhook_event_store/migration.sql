-- Add durable TradingView webhook persistence + dedupe tables

DO $$ BEGIN
  CREATE TYPE "WebhookEventStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'DUPLICATE', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "event_id" TEXT NOT NULL,
  "trace_id" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "normalized_payload" JSONB,
  "strategy_id" TEXT,
  "event" TEXT,
  "symbol" TEXT,
  "timeframe" TEXT,
  "timestamp" INTEGER,
  "status" "WebhookEventStatus" NOT NULL,
  "error_code" TEXT,
  "error_message" TEXT,
  "error_fields" TEXT[],
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("event_id")
);

CREATE INDEX IF NOT EXISTS "WebhookEvent_status_created_at_idx" ON "WebhookEvent" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "WebhookEvent_strategy_id_created_at_idx" ON "WebhookEvent" ("strategy_id", "created_at");
CREATE INDEX IF NOT EXISTS "WebhookEvent_dedupe_key_idx" ON "WebhookEvent" ("dedupe_key");

CREATE TABLE IF NOT EXISTS "WebhookDedupe" (
  "dedupe_key" TEXT NOT NULL,
  "first_event_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "WebhookDedupe_pkey" PRIMARY KEY ("dedupe_key"),
  CONSTRAINT "WebhookDedupe_first_event_id_key" UNIQUE ("first_event_id"),
  CONSTRAINT "WebhookDedupe_first_event_id_fkey"
    FOREIGN KEY ("first_event_id") REFERENCES "WebhookEvent"("event_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);


