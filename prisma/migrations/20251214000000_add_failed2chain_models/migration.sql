-- CreateTable: StrategySetup
CREATE TABLE "StrategySetup" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "entry" DOUBLE PRECISION NOT NULL,
    "stop" DOUBLE PRECISION NOT NULL,
    "tp1" DOUBLE PRECISION NOT NULL,
    "tp2" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    "expiryHint" TEXT,
    "optionSuggested" TEXT,
    "reasonCodes" JSONB NOT NULL,
    "gates" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SwingState
CREATE TABLE "SwingState" (
    "symbol" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "armedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "lastPrecloseAlertAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwingState_pkey" PRIMARY KEY ("symbol")
);

-- CreateIndex
CREATE INDEX "StrategySetup_strategyId_symbol_createdAt_idx" ON "StrategySetup"("strategyId", "symbol", "createdAt");


