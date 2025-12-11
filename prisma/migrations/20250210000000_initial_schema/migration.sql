-- CreateTable: Strategy
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Signal
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT,
    "type" TEXT NOT NULL,
    "direction" TEXT,
    "signal" TEXT NOT NULL,
    "tf" TEXT,
    "strikeHint" DOUBLE PRECISION,
    "riskMult" DOUBLE PRECISION,
    "miyagi" TEXT,
    "daily" TEXT,
    "symbol" TEXT,
    "newBias" TEXT,
    "rawPayload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Decision
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "signalId" TEXT,
    "strategyId" TEXT,
    "action" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL DEFAULT 'OPTION',
    "broker" TEXT NOT NULL,
    "strike" DOUBLE PRECISION,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "meta" JSONB NOT NULL,
    "reasoning" TEXT,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT,
    "broker" TEXT NOT NULL,
    "brokerOrderId" TEXT,
    "symbol" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL DEFAULT 'OPTION',
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "strike" DOUBLE PRECISION,
    "expiry" TIMESTAMP(3),
    "orderType" TEXT NOT NULL,
    "limitPrice" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "brokerResponse" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Position
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT,
    "strategyId" TEXT,
    "broker" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "instrumentType" TEXT NOT NULL DEFAULT 'OPTION',
    "direction" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "strike" DOUBLE PRECISION,
    "expiry" TIMESTAMP(3),
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnlPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Execution
CREATE TABLE "Execution" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "brokerExecId" TEXT,
    "symbol" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Execution_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ScannerEvent
CREATE TABLE "ScannerEvent" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "newBias" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiskLimit
CREATE TABLE "RiskLimit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxPositions" INTEGER NOT NULL DEFAULT 5,
    "maxDailyLoss" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
    "maxRiskPerTrade" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "maxRunnersPerCore" INTEGER NOT NULL DEFAULT 2,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RiskState
CREATE TABLE "RiskState" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyPnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyTrades" INTEGER NOT NULL DEFAULT 0,
    "openPositions" INTEGER NOT NULL DEFAULT 0,
    "totalRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_name_key" ON "Strategy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ScannerEvent_symbol_timestamp_key" ON "ScannerEvent"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "ScannerEvent_symbol_timestamp_idx" ON "ScannerEvent"("symbol", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "RiskLimit_name_key" ON "RiskLimit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RiskState_date_key" ON "RiskState"("date");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

