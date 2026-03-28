import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

interface ClobToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conditionId: string }> }
) {
  const { conditionId } = await params;

  try {
    const res = await fetch(`${CLOB_API}/markets/${conditionId}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    const data = await res.json();
    const tokens: ClobToken[] = data.tokens || [];

    // CLOB API returns a tokens array with outcome/price/token_id per outcome
    // Outcomes can be: Yes/No, team names, Over/Under, etc.
    const token1 = tokens[0];
    const token2 = tokens[1];

    if (!token1) {
      return NextResponse.json({ error: 'No token data' }, { status: 404 });
    }

    const yesPrice = token1?.price ?? 0.5;
    const noPrice = token2?.price ?? (1 - yesPrice);

    const isStandardYesNo = token1?.outcome === 'Yes' || token2?.outcome === 'No';

    const market = {
      id: data.condition_id || conditionId,
      eventId: '',
      ticker: data.condition_id || conditionId,
      title: data.question || conditionId,
      yesPrice: Math.round(yesPrice * 100) / 100,
      noPrice: Math.round(noPrice * 100) / 100,
      volume: null,
      change24h: null,
      category: null,
      rulesPrimary: data.description || null,
      closeTime: data.end_date_iso || null,
      expirationTime: data.end_date_iso || null,
      conditionId: data.condition_id || conditionId,
      yesTokenId: token1?.token_id || '',
      noTokenId: token2?.token_id || '',
      negRisk: data.neg_risk ?? false,
      tickSize: String(data.minimum_tick_size || '0.01'),
      outcomeName: !isStandardYesNo ? (token1?.outcome || null) : null,
      outcome2Name: !isStandardYesNo ? (token2?.outcome || null) : null,
    };

    return NextResponse.json({ market });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch market';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
