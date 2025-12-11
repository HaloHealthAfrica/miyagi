-- CreateTable: SignalQuality
CREATE TABLE "SignalQuality" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "tfcScore" DOUBLE PRECISION,
    "volScore" DOUBLE PRECISION,
    "outcome" TEXT,
    "pnl" DOUBLE PRECISION,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalQuality_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignalQuality_signalId_key" ON "SignalQuality"("signalId");

-- CreateIndex
CREATE INDEX "SignalQuality_successRate_idx" ON "SignalQuality"("successRate");

-- CreateIndex
CREATE INDEX "SignalQuality_outcome_idx" ON "SignalQuality"("outcome");

-- AddForeignKey
ALTER TABLE "SignalQuality" ADD CONSTRAINT "SignalQuality_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

