import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

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
  const { slug, title, searchTerms, emoji, subtitle, markets: rawMarkets } = body;

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

  // Save markets passed from admin UI
  let marketError: string | null = null;
  let receivedCount = 0;

  interface RawMarket {
    ticker: string;
    title: string;
    yesBid?: string;
    yesAsk?: string;
    noBid?: string;
    noAsk?: string;
    volume?: number;
  }

  const marketList: RawMarket[] = Array.isArray(rawMarkets) ? rawMarkets : [];
  receivedCount = marketList.length;

  if (marketList.length > 0) {
    try {
      await prisma.market.deleteMany({ where: { eventId: event.id } });

      await Promise.all(
        marketList.map(m => {
          const yesBid = parseFloat(m.yesBid || '0') || 0;
          const yesAsk = parseFloat(m.yesAsk || '0') || 0;
          const noBid = parseFloat(m.noBid || '0') || 0;
          const noAsk = parseFloat(m.noAsk || '0') || 0;
          const yesPrice = yesAsk > 0 && yesBid > 0 ? (yesBid + yesAsk) / 2 : yesAsk || yesBid || 0.5;
          const noPrice = noAsk > 0 && noBid > 0 ? (noBid + noAsk) / 2 : noAsk || noBid || 0.5;

          return prisma.market.create({
            data: {
              eventId: event.id,
              ticker: m.ticker,
              title: m.title,
              yesPrice: Math.round(yesPrice * 100) / 100,
              noPrice: Math.round(noPrice * 100) / 100,
              volume: m.volume ?? null,
              change24h: null,
              category: null,
            },
          });
        })
      );

      event = await prisma.event.findUnique({
        where: { slug },
        include: { markets: true },
      }) as typeof event;
    } catch (err) {
      marketError = err instanceof Error ? err.message : String(err);
      console.error('Market save error:', err);
    }
  }

  // Set as active event
  await prisma.siteConfig.upsert({
    where: { key: 'activeEventSlug' },
    update: { value: slug },
    create: { key: 'activeEventSlug', value: slug },
  });

  return NextResponse.json({
    ok: true,
    activeEventSlug: slug,
    event,
    debug: { receivedMarkets: receivedCount, savedMarkets: event.markets?.length || 0, marketError },
  });
}
