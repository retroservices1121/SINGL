-- Add tokenId column to Position table (CLOB token ID for sell orders)
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "tokenId" TEXT;
