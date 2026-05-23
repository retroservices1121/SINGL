'use client';

import { createAggClient as create, type AggClient } from '@agg-build/sdk';
import { getStoredAccessCode } from '@/app/components/AccessGate';

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
    auth: {
      // AGG enforces its own early-access gate on auth endpoints. We reuse
      // the code the user already submitted at our SINGL gate (same list
      // of codes AGG issued us). Without this, signIn returns 400
      // `EARLY_ACCESS_CODE_REQUIRED`.
      getEarlyAccessCode: () => getStoredAccessCode(),
    },
  });
  return cached;
}

export const AGG_APP_ID = APP_ID;
export const AGG_BASE_URL = BASE_URL;
