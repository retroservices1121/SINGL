-- Trade-to-earn: cumulative AGG trade volume credited to a player and the
-- points it earned (volume base points x hold multiplier). Cumulative so a
-- re-sync only credits the delta.
ALTER TABLE "OraclePlayer" ADD COLUMN IF NOT EXISTS "tradeVolumeUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "OraclePlayer" ADD COLUMN IF NOT EXISTS "tradePoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OraclePlayer" ADD COLUMN IF NOT EXISTS "volumeSyncedAt" TIMESTAMP(3);
