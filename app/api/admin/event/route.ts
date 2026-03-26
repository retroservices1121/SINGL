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

// POST: set active event
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { slug, title, searchTerms, contentTerms, emoji, subtitle, imageUrl, eventMeta, markets: rawMarkets, eventTicker } = body;

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const eventTitle = title || slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  // searchTerms: used for Polymarket market lookup (include event ticker if available)
  const terms = searchTerms || (eventTicker ? [eventTicker, eventTitle] : [eventTitle]);
  // contentTerms: used for news/social media searches (descriptive, human-readable)
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

  // If no markets provided, just update event metadata and return
  if (!rawMarkets) {
    await prisma.siteConfig.upsert({
      where: { key: 'activeEventSlug' },
      update: { value: slug },
      create: { key: 'activeEventSlug', value: slug },
    });
    return NextResponse.json({ ok: true, activeEventSlug: slug, event });
  }

  // Save markets
  let marketError: string | null = null;
  let receivedCount = 0;

  interface RawMarket {
    ticker?: string;
    condition_id?: string;
    conditionId?: string;
    title: string;
    yesPrice?: number;
    noPrice?: number;
    yesBid?: string;
    yesAsk?: string;
    noBid?: string;
    noAsk?: string;
    volume?: number | string;
    openInterest?: number;
    rulesPrimary?: string;
    closeTime?: number | string;
    expirationTime?: number | string;
    yesTokenId?: string;
    noTokenId?: string;
    negRisk?: boolean;
    tickSize?: string;
  }

  const marketList: RawMarket[] = Array.isArray(rawMarkets) ? rawMarkets : [];
  receivedCount = marketList.length;

  if (marketList.length > 0) {
    try {
      await prisma.market.deleteMany({ where: { eventId: event.id } });

      await Promise.all(
        marketList.map(m => {
          // Support both old format (yesBid/yesAsk) and Polymarket format (yesPrice/noPrice)
          let yesPrice = m.yesPrice ?? 0;
          let noPrice = m.noPrice ?? 0;

          if (!yesPrice && !noPrice) {
            const yesBid = parseFloat(m.yesBid || '0') || 0;
            const yesAsk = parseFloat(m.yesAsk || '0') || 0;
            const noBid = parseFloat(m.noBid || '0') || 0;
            const noAsk = parseFloat(m.noAsk || '0') || 0;
            yesPrice = yesAsk || yesBid || 0;
            noPrice = noAsk || noBid || 0;
          }

          // ticker can come as ticker or condition_id from Polymarket
          const ticker = m.ticker || m.condition_id || m.title.slice(0, 50);
          const vol = typeof m.volume === 'string' ? parseFloat(m.volume) || null : (m.volume ?? null);

          // closeTime can be ISO string or unix timestamp
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
              conditionId: m.conditionId || m.condition_id || ticker,
              yesTokenId: m.yesTokenId || null,
              noTokenId: m.noTokenId || null,
              negRisk: m.negRisk ?? false,
              tickSize: m.tickSize || '0.01',
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
