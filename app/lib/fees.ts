import type { FeeBreakdown } from '@/app/types';

const FEE_RATE = 0.005; // 0.50%

export const TREASURY_WALLET = '2tvRpFYe7N2hKF8JoYotpt936iYjSp6T3hjimKguatoE';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_DECIMALS = 6;

export function calculateFee(amount: number): FeeBreakdown {
  const fee = Math.round(amount * FEE_RATE * 100) / 100;
  const netAmount = amount - fee;
  return { fee, netAmount, feeRate: FEE_RATE };
}
