import { create } from 'zustand';
import type { MarketData } from '@/app/types';

interface TradeStore {
  isOpen: boolean;
  market: MarketData | null;
  side: 'yes' | 'no';
  amount: number;
  submitting: boolean;
  confirmed: boolean;
  txSignature: string | null;
  openTrade: (market: MarketData, side: 'yes' | 'no') => void;
  closeTrade: () => void;
  setAmount: (amount: number) => void;
  setSubmitting: (submitting: boolean) => void;
  setConfirmed: (txSignature: string) => void;
}

export const useTradeStore = create<TradeStore>((set) => ({
  isOpen: false,
  market: null,
  side: 'yes',
  amount: 10,
  submitting: false,
  confirmed: false,
  txSignature: null,
  openTrade: (market, side) => set({
    isOpen: true,
    market,
    side,
    amount: 10,
    submitting: false,
    confirmed: false,
    txSignature: null,
  }),
  closeTrade: () => set({
    isOpen: false,
    market: null,
    submitting: false,
    confirmed: false,
    txSignature: null,
  }),
  setAmount: (amount) => set({ amount }),
  setSubmitting: (submitting) => set({ submitting }),
  setConfirmed: (txSignature) => set({ confirmed: true, submitting: false, txSignature }),
}));
