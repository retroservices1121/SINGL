-- Add Polymarket-specific fields to Market table
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "conditionId" TEXT;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "yesTokenId" TEXT;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "noTokenId" TEXT;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "negRisk" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "tickSize" TEXT NOT NULL DEFAULT '0.01';

-- Remove old DFlow-specific column if it exists
ALTER TABLE "Market" DROP COLUMN IF EXISTS "dflowData";

-- Drop gas prices table (no longer used)
DROP TABLE IF EXISTS "GasPrice";
