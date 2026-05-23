import { NextRequest, NextResponse } from 'next/server';
import { aggFetch, mapAggMarket, type AggVenueMarket } from '@/app/lib/aggServer';

export const dynamic = 'force-dynamic';

// Folder name remains [conditionId] for URL stability; the value is now an AGG venueMarketId.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conditionId: string }> }
) {
  const { conditionId: venueMarketId } = await params;

  try {
    const data = await aggFetch<AggVenueMarket>(`/venue-events/markets/${encodeURIComponent(venueMarketId)}`);
    const market = mapAggMarket({ id: venueMarketId }, data);
    if (!market) return NextResponse.json({ error: 'No outcome data' }, { status: 404 });
    return NextResponse.json({ market });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch market';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
