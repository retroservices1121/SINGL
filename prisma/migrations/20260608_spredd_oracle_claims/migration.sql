-- AlterTable
ALTER TABLE "OraclePlayer" ADD COLUMN "claimLockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OracleClaim" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OracleClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OracleClaim_playerId_idx" ON "OracleClaim"("playerId");
CREATE INDEX "OracleClaim_status_idx" ON "OracleClaim"("status");

-- AddForeignKey
ALTER TABLE "OracleClaim" ADD CONSTRAINT "OracleClaim_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "OraclePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
