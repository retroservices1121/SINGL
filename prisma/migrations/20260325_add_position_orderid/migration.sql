-- Add orderId column to Position table
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "orderId" TEXT;
