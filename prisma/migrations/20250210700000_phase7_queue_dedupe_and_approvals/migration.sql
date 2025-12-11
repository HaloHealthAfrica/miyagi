-- AlterTable: Job (add dedupeKey)
ALTER TABLE "Job" ADD COLUMN "dedupeKey" TEXT;

-- CreateIndex (unique)
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateTable: DecisionApproval (two-man rule)
CREATE TABLE "DecisionApproval" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionApproval_pkey" PRIMARY KEY ("id")
);

-- Unique constraint (decisionId, approverId)
CREATE UNIQUE INDEX "DecisionApproval_decisionId_approverId_key" ON "DecisionApproval"("decisionId", "approverId");

-- Indexes
CREATE INDEX "DecisionApproval_decisionId_idx" ON "DecisionApproval"("decisionId");

-- Foreign key
ALTER TABLE "DecisionApproval" ADD CONSTRAINT "DecisionApproval_decisionId_fkey"
  FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;


