-- AlterTable Event: add metadata fields
ALTER TABLE "Event" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "volume" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "liquidity" DOUBLE PRECISION;
ALTER TABLE "Event" ADD COLUMN "openInterest" DOUBLE PRECISION;

-- AlterTable Market: add rules and timing
ALTER TABLE "Market" ADD COLUMN "rulesPrimary" TEXT;
ALTER TABLE "Market" ADD COLUMN "closeTime" TIMESTAMP(3);
ALTER TABLE "Market" ADD COLUMN "expirationTime" TIMESTAMP(3);
