import { create } from 'zustand';
import type { EventData, MarketData } from '@/app/types';

interface EventStore {
  currentEvent: EventData | null;
  markets: MarketData[];
  loading: boolean;
  error: string | null;
  setCurrentEvent: (event: EventData) => void;
  setMarkets: (markets: MarketData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEventStore = create<EventStore>((set) => ({
  currentEvent: null,
  markets: [],
  loading: false,
  error: null,
  setCurrentEvent: (event) => set({ currentEvent: event, markets: event.markets }),
  setMarkets: (markets) => set({ markets }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
