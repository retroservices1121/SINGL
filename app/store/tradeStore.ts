import { create } from 'zustand';
import type { MarketData } from '@/app/types';

interface TradeStore {
  isOpen: boolean;
  market: MarketData | null;
  side: 'yes' | 'no';
  amount: number;
  submitting: boolean;
  confirmed: boolean;
  orderId: string | null;
  // Market detail overlay
  detailOpen: boolean;
  detailMarket: MarketData | null;
  openTrade: (market: MarketData, side: 'yes' | 'no') => void;
  closeTrade: () => void;
  openDetail: (market: MarketData) => void;
  closeDetail: () => void;
  setAmount: (amount: number) => void;
  setSubmitting: (submitting: boolean) => void;
  setConfirmed: (orderId: string) => void;
}

export const useTradeStore = create<TradeStore>((set) => ({
  isOpen: false,
  market: null,
  side: 'yes',
  amount: 10,
  submitting: false,
  confirmed: false,
  orderId: null,
  detailOpen: false,
  detailMarket: null,
  openTrade: (market, side) => set({
    isOpen: true,
    market,
    side,
    amount: 10,
    submitting: false,
    confirmed: false,
    orderId: null,
  }),
  closeTrade: () => set({
    isOpen: false,
    market: null,
    submitting: false,
    confirmed: false,
    orderId: null,
  }),
  openDetail: (market) => set({
    detailOpen: true,
    detailMarket: market,
  }),
  closeDetail: () => set({
    detailOpen: false,
    detailMarket: null,
  }),
  setAmount: (amount) => set({ amount }),
  setSubmitting: (submitting) => set({ submitting }),
  setConfirmed: (orderId) => set({ confirmed: true, submitting: false, orderId }),
}));
