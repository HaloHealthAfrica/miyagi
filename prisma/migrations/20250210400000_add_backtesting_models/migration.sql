-- CreateTable: BacktestRun
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT '5min',
    "stopLossPercent" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "takeProfitPercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "maxHoldBars" INTEGER NOT NULL DEFAULT 78,
    "positionSize" INTEGER NOT NULL DEFAULT 1,
    "contractMultiplier" INTEGER NOT NULL DEFAULT 100,

    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "winningTrades" INTEGER NOT NULL DEFAULT 0,
    "losingTrades" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,

    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BacktestTrade
CREATE TABLE "BacktestTrade" (
    "id" TEXT NOT NULL,
    "backtestRunId" TEXT NOT NULL,
    "signalId" TEXT,
    "decisionId" TEXT,
    "direction" TEXT NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL,
    "exitTime" TIMESTAMP(3) NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "pnlPercent" DOUBLE PRECISION NOT NULL,
    "exitReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacktestTrade_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "BacktestRun_symbol_startDate_endDate_idx" ON "BacktestRun"("symbol", "startDate", "endDate");
CREATE INDEX "BacktestTrade_backtestRunId_idx" ON "BacktestTrade"("backtestRunId");
CREATE INDEX "BacktestTrade_entryTime_idx" ON "BacktestTrade"("entryTime");
CREATE INDEX "BacktestTrade_exitReason_idx" ON "BacktestTrade"("exitReason");

-- Foreign keys
ALTER TABLE "BacktestTrade" ADD CONSTRAINT "BacktestTrade_backtestRunId_fkey"
  FOREIGN KEY ("backtestRunId") REFERENCES "BacktestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BacktestTrade" ADD CONSTRAINT "BacktestTrade_signalId_fkey"
  FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BacktestTrade" ADD CONSTRAINT "BacktestTrade_decisionId_fkey"
  FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;


