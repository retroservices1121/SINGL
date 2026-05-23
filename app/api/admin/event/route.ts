import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret') || req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) return NextResponse.json({ activeEventSlug: null });

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: { markets: true },
  });

  return NextResponse.json({ activeEventSlug: config.value, event });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { slug, title, searchTerms, contentTerms, emoji, subtitle, imageUrl, eventMeta, markets: rawMarkets, eventTicker } = body;

  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

  const eventTitle = title || slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const terms = searchTerms || (eventTicker ? [eventTicker, eventTitle] : [eventTitle]);
  const content = contentTerms || [eventTitle];
  const meta = eventMeta || {};

  let event = await prisma.event.upsert({
    where: { slug },
    update: {
      ...(title && { title }),
      ...(searchTerms && { searchTerms }),
      ...(contentTerms && { contentTerms }),
      ...(emoji && { emoji }),
      ...(subtitle && { subtitle }),
      ...(imageUrl && { imageUrl }),
      ...(eventMeta?.volume !== undefined && { volume: eventMeta.volume }),
      ...(eventMeta?.liquidity !== undefined && { liquidity: eventMeta.liquidity }),
      ...(eventMeta?.openInterest !== undefined && { openInterest: eventMeta.openInterest }),
    },
    create: {
      slug,
      title: eventTitle,
      searchTerms: terms,
      contentTerms: content,
      ...(emoji && { emoji }),
      ...(subtitle && { subtitle }),
      ...(imageUrl && { imageUrl }),
      volume: meta.volume ?? null,
      liquidity: meta.liquidity ?? null,
      openInterest: meta.openInterest ?? null,
    },
    include: { markets: true },
  });

  if (!rawMarkets) {
    await prisma.siteConfig.upsert({
      where: { key: 'activeEventSlug' },
      update: { value: slug },
      create: { key: 'activeEventSlug', value: slug },
    });
    return NextResponse.json({ ok: true, activeEventSlug: slug, event });
  }

  let marketError: string | null = null;
  let receivedCount = 0;

  interface RawMarket {
    ticker?: string;
    venueMarketId?: string;
    id?: string;
    title: string;
    yesPrice?: number;
    noPrice?: number;
    volume?: number | string;
    rulesPrimary?: string;
    closeTime?: number | string;
    expirationTime?: number | string;
    yesOutcomeId?: string;
    noOutcomeId?: string;
    tickSize?: string;
    venue?: string;
    outcomeName?: string | null;
    outcome2Name?: string | null;
  }

  const marketList: RawMarket[] = Array.isArray(rawMarkets) ? rawMarkets : [];
  receivedCount = marketList.length;

  if (marketList.length > 0) {
    try {
      await prisma.market.deleteMany({ where: { eventId: event.id } });

      await Promise.all(
        marketList.map(m => {
          const yesPrice = m.yesPrice ?? 0;
          const noPrice = m.noPrice ?? 0;
          const ticker = m.ticker || m.venueMarketId || m.id || m.title.slice(0, 50);
          const vol = typeof m.volume === 'string' ? parseFloat(m.volume) || null : (m.volume ?? null);

          let closeTime: Date | null = null;
          if (m.closeTime) {
            closeTime = typeof m.closeTime === 'string' ? new Date(m.closeTime) : new Date(m.closeTime * 1000);
          }
          let expirationTime: Date | null = null;
          if (m.expirationTime) {
            expirationTime = typeof m.expirationTime === 'string' ? new Date(m.expirationTime) : new Date(m.expirationTime * 1000);
          }

          return prisma.market.create({
            data: {
              eventId: event.id,
              ticker,
              title: m.title,
              yesPrice: Math.round(yesPrice * 100) / 100,
              noPrice: Math.round(noPrice * 100) / 100,
              volume: vol,
              rulesPrimary: m.rulesPrimary ?? null,
              closeTime,
              expirationTime,
              change24h: null,
              category: null,
              venueMarketId: m.venueMarketId || m.id || ticker,
              yesOutcomeId: m.yesOutcomeId || null,
              noOutcomeId: m.noOutcomeId || null,
              tickSize: m.tickSize || '0.01',
              venue: m.venue || null,
              outcomeName: m.outcomeName ?? null,
              outcome2Name: m.outcome2Name ?? null,
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
