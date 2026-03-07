import type { MarketData, KYCStatus, TradeParams } from '@/app/types';

const METADATA = process.env.NEXT_PUBLIC_DFLOW_METADATA_URL || 'https://prediction-markets-api.dflow.net';
const TRADE = process.env.NEXT_PUBLIC_DFLOW_TRADE_URL || 'https://quote-api.dflow.net';

function deduplicateMarkets(markets: Record<string, unknown>[]): MarketData[] {
  const seen = new Set<string>();
  const deduped: MarketData[] = [];
  for (const m of markets) {
    const ticker = (m.ticker as string) || (m.id as string) || '';
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    deduped.push({
      id: (m.id as string) || ticker,
      eventId: '',
      ticker,
      title: (m.title as string) || (m.question as string) || '',
      yesPrice: (m.yesPrice as number) ?? (m.yes_price as number) ?? 0.5,
      noPrice: (m.noPrice as number) ?? (m.no_price as number) ?? 0.5,
      volume: (m.volume as number) ?? null,
      change24h: (m.change24h as number) ?? null,
      category: (m.category as string) ?? null,
    });
  }
  return deduped;
}

export async function getMarkets(searchTerms: string[]): Promise<MarketData[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.DFLOW_API_KEY) {
    headers['x-api-key'] = process.env.DFLOW_API_KEY;
  }

  const results = await Promise.all(
    searchTerms.map(term =>
      fetch(`${METADATA}/api/v1/search/events?q=${encodeURIComponent(term)}&limit=10`, { headers })
        .then(r => r.json())
        .catch(() => ({ events: [] }))
    )
  );

  return deduplicateMarkets(results.flatMap((r: Record<string, unknown>) => (r.events as Record<string, unknown>[]) || []));
}

export async function checkKYCStatus(walletAddress: string): Promise<KYCStatus> {
  const res = await fetch(`${TRADE}/api/v1/kyc/status`, {
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.DFLOW_API_KEY && { 'x-api-key': process.env.DFLOW_API_KEY }),
    },
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });
  if (!res.ok) return { verified: false };
  return res.json();
}

export async function initiateKYC(walletAddress: string): Promise<string> {
  const res = await fetch(`${TRADE}/api/v1/kyc/initiate`, {
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.DFLOW_API_KEY && { 'x-api-key': process.env.DFLOW_API_KEY }),
    },
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });
  const data = await res.json();
  return data.verificationUrl;
}

export async function buildTradeTransaction({ walletAddress, marketTicker, side, amount }: TradeParams) {
  const res = await fetch(`${TRADE}/api/v1/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.DFLOW_API_KEY && { 'x-api-key': process.env.DFLOW_API_KEY }),
    },
    body: JSON.stringify({
      userPublicKey: walletAddress,
      ticker: marketTicker,
      side,
      amount,
      settlementMint: 'USDC',
    }),
  });
  const { transaction } = await res.json();
  return transaction;
}
