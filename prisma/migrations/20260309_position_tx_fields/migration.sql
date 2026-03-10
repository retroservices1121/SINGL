-- AlterTable
ALTER TABLE "Position" ADD COLUMN "txSignature" TEXT;
ALTER TABLE "Position" ADD COLUMN "closeTxSig" TEXT;
ALTER TABLE "Position" ADD COLUMN "closePrice" DOUBLE PRECISION;
ALTER TABLE "Position" ADD COLUMN "realizedPnl" DOUBLE PRECISION;
