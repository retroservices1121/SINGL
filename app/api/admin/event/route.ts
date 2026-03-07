import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getMarkets } from '@/app/lib/dflow';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

// GET: get current active event
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) {
    return NextResponse.json({ activeEventSlug: null });
  }

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: { markets: true },
  });

  return NextResponse.json({ activeEventSlug: config.value, event });
}

// POST: set active event by slug, optionally with search terms
// Body: { slug: string, title?: string, searchTerms?: string[], emoji?: string, subtitle?: string }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { slug, title, searchTerms, emoji, subtitle } = body;

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  // Upsert the event
  const eventTitle = title || slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const terms = searchTerms || [eventTitle];

  let event = await prisma.event.upsert({
    where: { slug },
    update: {
      title: eventTitle,
      searchTerms: terms,
      ...(emoji && { emoji }),
      ...(subtitle && { subtitle }),
    },
    create: {
      slug,
      title: eventTitle,
      searchTerms: terms,
      ...(emoji && { emoji }),
      ...(subtitle && { subtitle }),
    },
    include: { markets: true },
  });

  // Fetch markets from DFlow if none exist
  if (event.markets.length === 0 && terms.length > 0) {
    try {
      const dflowMarkets = await getMarkets(terms);
      if (dflowMarkets.length > 0) {
        await Promise.all(
          dflowMarkets.map(m =>
            prisma.market.create({
              data: {
                eventId: event.id,
                ticker: m.ticker,
                title: m.title,
                yesPrice: m.yesPrice,
                noPrice: m.noPrice,
                volume: m.volume,
                change24h: m.change24h,
                category: m.category,
              },
            })
          )
        );
        event = await prisma.event.findUnique({
          where: { slug },
          include: { markets: true },
        }) as typeof event;
      }
    } catch (err) {
      console.error('DFlow market fetch error:', err);
    }
  }

  // Set as active event
  await prisma.siteConfig.upsert({
    where: { key: 'activeEventSlug' },
    update: { value: slug },
    create: { key: 'activeEventSlug', value: slug },
  });

  return NextResponse.json({ ok: true, activeEventSlug: slug, event });
}
