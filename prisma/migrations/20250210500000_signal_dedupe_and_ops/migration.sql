-- AlterTable: Signal (add dedupeKey for idempotency)
ALTER TABLE "Signal" ADD COLUMN "dedupeKey" TEXT;

-- CreateIndex (unique)
CREATE UNIQUE INDEX "Signal_dedupeKey_key" ON "Signal"("dedupeKey");


