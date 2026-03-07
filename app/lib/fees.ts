import type { FeeBreakdown } from '@/app/types';

const FEE_RATE = 0.005; // 0.50%

export function calculateFee(amount: number): FeeBreakdown {
  const fee = Math.round(amount * FEE_RATE * 100) / 100;
  const netAmount = amount - fee;
  return { fee, netAmount, feeRate: FEE_RATE };
}
