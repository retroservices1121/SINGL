import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const markets = await prisma.market.findMany({
    where: { ogImageUrl: { not: null } },
    select: { id: true, venueMarketId: true, title: true, ogImageUrl: true },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ markets });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueMarketId, ogImageUrl } = await req.json();

  if (!venueMarketId) return NextResponse.json({ error: 'venueMarketId is required' }, { status: 400 });

  const market = await prisma.market.findFirst({
    where: { OR: [{ venueMarketId }, { ticker: venueMarketId }] },
  });

  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 });

  const updated = await prisma.market.update({
    where: { id: market.id },
    data: { ogImageUrl: ogImageUrl || null },
  });

  return NextResponse.json({
    ok: true,
    market: { id: updated.id, venueMarketId: updated.venueMarketId, title: updated.title, ogImageUrl: updated.ogImageUrl },
  });
}
