import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gas-prices?region=US&grade=regular&weeks=12
 * Returns stored EIA gas price history for the active event
 */
export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get('region') || 'US';
  const grade = req.nextUrl.searchParams.get('grade') || 'regular';
  const weeks = parseInt(req.nextUrl.searchParams.get('weeks') || '12', 10);

  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) {
    return NextResponse.json({ error: 'No active event' }, { status: 404 });
  }

  const event = await prisma.event.findUnique({ where: { slug: config.value } });
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const prices = await prisma.gasPrice.findMany({
    where: {
      eventId: event.id,
      region,
      grade,
    },
    orderBy: { weekOf: 'desc' },
    take: weeks,
  });

  // Latest price for quick display
  const latest = prices[0] || null;
  const previous = prices[1] || null;
  const change = latest && previous ? +(latest.price - previous.price).toFixed(3) : null;

  return NextResponse.json({
    event: event.title,
    region,
    grade,
    latest: latest ? { price: latest.price, weekOf: latest.weekOf } : null,
    change,
    history: prices.map(p => ({
      price: p.price,
      weekOf: p.weekOf,
    })),
  });
}
