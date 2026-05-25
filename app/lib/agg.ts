'use client';

import { createAggClient as create, type AggClient } from '@agg-build/sdk';
import { getStoredAccessCode } from '@/app/components/AccessGate';

const APP_ID = process.env.NEXT_PUBLIC_AGG_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_AGG_BASE_URL || 'https://api.agg.market';
const WS_URL = process.env.NEXT_PUBLIC_AGG_WS_URL || 'wss://ws.agg.market/ws';
// AGG can be configured to require x-app-api-key on every request (the
// client SDK will return "This app requires x-app-api-key for all
// requests" when this is on and the header is missing). In that mode
// the only way the browser SDK can authenticate auth/* and other public
// endpoints is to embed a key in the bundle. Generate a *publishable*
// (non-admin) key in the AGG dashboard and set NEXT_PUBLIC_AGG_API_KEY
// — DO NOT reuse AGG_SERVER_API_KEY here, that one carries server
// permissions and ends up in the JS bundle.
const PUBLIC_API_KEY = process.env.NEXT_PUBLIC_AGG_API_KEY || '';

let cached: AggClient | null = null;

export function getAggClient(): AggClient {
  if (cached) return cached;
  cached = create({
    appId: APP_ID,
    baseUrl: BASE_URL,
    wsUrl: WS_URL,
    ...(PUBLIC_API_KEY ? { apiKey: PUBLIC_API_KEY } : {}),
    // AGG's access codes are SINGLE-USE. With the default
    // authDelivery="body", refresh tokens live only in memory and are
    // lost on page reload — so each cold-start tries a fresh signIn
    // which burns a new code. Switching to "cookie-refresh" makes AGG
    // set an HttpOnly refresh-token cookie that survives reload, and
    // the SDK silently refreshes on cold start without needing a code.
    authDelivery: 'cookie-refresh',
    auth: {
      // Still required on the very first sign-in (no refresh cookie yet).
      // After that, the cookie path takes over and the code isn't needed
      // again until the cookie expires.
      getEarlyAccessCode: () => getStoredAccessCode(),
    },
  });
  return cached;
}

export const AGG_APP_ID = APP_ID;
export const AGG_BASE_URL = BASE_URL;
