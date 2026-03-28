import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOB_API = 'https://clob.polymarket.com';

function parseJsonArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
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

    const outcomes = parseJsonArray(data.outcomes);
    const prices = parseJsonArray(data.outcomePrices);
    const tokenIds = parseJsonArray(data.clobTokenIds);

    let yesIdx = outcomes.indexOf('Yes');
    let noIdx = outcomes.indexOf('No');

    // Game matchup markets use team names, not Yes/No
    if (yesIdx === -1 && noIdx === -1 && outcomes.length === 2) {
      yesIdx = 0;
      noIdx = 1;
    }

    const yesPrice = yesIdx >= 0 ? parseFloat(prices[yesIdx] || '0.5') : 0.5;
    const noPrice = noIdx >= 0 ? parseFloat(prices[noIdx] || '0.5') : 0.5;

    const isStandardYesNo = outcomes.includes('Yes') && outcomes.includes('No');

    const market = {
      id: data.condition_id || conditionId,
      eventId: '',
      ticker: data.condition_id || conditionId,
      title: data.question || conditionId,
      yesPrice: Math.round(yesPrice * 100) / 100,
      noPrice: Math.round(noPrice * 100) / 100,
      volume: data.volume ? parseFloat(data.volume) : null,
      change24h: null,
      category: null,
      rulesPrimary: data.description || null,
      closeTime: data.end_date_iso || null,
      expirationTime: data.end_date_iso || null,
      conditionId: data.condition_id || conditionId,
      yesTokenId: yesIdx >= 0 ? tokenIds[yesIdx] || '' : '',
      noTokenId: noIdx >= 0 ? tokenIds[noIdx] || '' : '',
      negRisk: data.neg_risk ?? false,
      tickSize: data.minimum_tick_size || '0.01',
      outcomeName: !isStandardYesNo && outcomes.length >= 1 ? outcomes[0] : null,
      outcome2Name: !isStandardYesNo && outcomes.length >= 2 ? outcomes[1] : null,
    };

    return NextResponse.json({ market });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch market';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
