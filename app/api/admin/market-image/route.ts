import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

/**
 * GET /api/admin/market-image?secret=...
 * Returns all markets with custom OG images set.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const markets = await prisma.market.findMany({
    where: { ogImageUrl: { not: null } },
    select: { id: true, conditionId: true, title: true, ogImageUrl: true },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ markets });
}

/**
 * POST /api/admin/market-image
 * Body: { conditionId: string, ogImageUrl: string | null }
 * Sets or clears a custom OG image for a market.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { conditionId, ogImageUrl } = await req.json();

  if (!conditionId) {
    return NextResponse.json({ error: 'conditionId is required' }, { status: 400 });
  }

  // Find market by conditionId or ticker
  const market = await prisma.market.findFirst({
    where: { OR: [{ conditionId }, { ticker: conditionId }] },
  });

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  const updated = await prisma.market.update({
    where: { id: market.id },
    data: { ogImageUrl: ogImageUrl || null },
  });

  return NextResponse.json({
    ok: true,
    market: { id: updated.id, conditionId: updated.conditionId, title: updated.title, ogImageUrl: updated.ogImageUrl },
  });
}
