-- AlterTable: Add new fields to Position
ALTER TABLE "Position" ADD COLUMN "stopLoss" DOUBLE PRECISION,
ADD COLUMN "takeProfit" DOUBLE PRECISION,
ADD COLUMN "stopLossPercent" DOUBLE PRECISION DEFAULT 5.0,
ADD COLUMN "takeProfitPercent" DOUBLE PRECISION DEFAULT 10.0,
ADD COLUMN "exitReason" TEXT,
ADD COLUMN "lastPriceUpdate" TIMESTAMP(3);

-- CreateTable: TradeOutcome
CREATE TABLE "TradeOutcome" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "signalId" TEXT,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION NOT NULL,
    "pnlPercent" DOUBLE PRECISION NOT NULL,
    "holdTime" INTEGER NOT NULL,
    "exitReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeOutcome_positionId_key" ON "TradeOutcome"("positionId");

-- CreateIndex
CREATE INDEX "TradeOutcome_decisionId_idx" ON "TradeOutcome"("decisionId");

-- CreateIndex
CREATE INDEX "TradeOutcome_signalId_idx" ON "TradeOutcome"("signalId");

-- CreateIndex
CREATE INDEX "TradeOutcome_exitReason_idx" ON "TradeOutcome"("exitReason");

-- AddForeignKey
ALTER TABLE "TradeOutcome" ADD CONSTRAINT "TradeOutcome_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeOutcome" ADD CONSTRAINT "TradeOutcome_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeOutcome" ADD CONSTRAINT "TradeOutcome_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

