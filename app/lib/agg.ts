'use client';

import { createAggClient as create, type AggClient } from '@agg-build/sdk';

const APP_ID = process.env.NEXT_PUBLIC_AGG_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_AGG_BASE_URL || 'https://api.agg.market';
const WS_URL = process.env.NEXT_PUBLIC_AGG_WS_URL || 'wss://ws.agg.market/ws';

let cached: AggClient | null = null;

export function getAggClient(): AggClient {
  if (cached) return cached;
  cached = create({
    appId: APP_ID,
    baseUrl: BASE_URL,
    wsUrl: WS_URL,
  });
  return cached;
}

export const AGG_APP_ID = APP_ID;
export const AGG_BASE_URL = BASE_URL;
