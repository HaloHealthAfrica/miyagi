-- CreateTable: BacktestExperiment
CREATE TABLE "BacktestExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacktestExperiment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BacktestExperiment_kind_status_idx" ON "BacktestExperiment"("kind", "status");

-- AlterTable: BacktestRun
ALTER TABLE "BacktestRun" ADD COLUMN "experimentId" TEXT;
ALTER TABLE "BacktestRun" ADD COLUMN "slippageBps" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "BacktestRun" ADD COLUMN "feePerTrade" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX "BacktestRun_experimentId_idx" ON "BacktestRun"("experimentId");

ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "BacktestExperiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;


