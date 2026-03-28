import { Metadata } from 'next';
import { prisma } from '@/app/lib/db';
import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const position = await prisma.position.findUnique({ where: { id } });

  if (!position) {
    return { title: 'Position Not Found | SINGL' };
  }

  const isOpen = position.status === 'open';
  const market = await prisma.market.findFirst({
    where: {
      OR: [
        { ticker: position.marketTicker },
        { ticker: { startsWith: position.marketTicker } },
      ],
    },
    select: { yesPrice: true, noPrice: true },
  });

  const livePrice = position.side?.toLowerCase() === 'yes'
    ? (market?.yesPrice ?? position.avgPrice)
    : (market?.noPrice ?? position.avgPrice);
  const currentValue = isOpen ? position.shares * livePrice : position.costBasis + (position.realizedPnl || 0);
  const pnl = isOpen ? currentValue - position.costBasis : (position.realizedPnl || 0);
  const pnlPct = position.costBasis > 0 ? (pnl / position.costBasis) * 100 : 0;
  const entryPrice = Math.round(position.avgPrice * 100);
  const nowPrice = Math.round(livePrice * 100);

  const pnlStr = `${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`;
  const pnlPctStr = `${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(1)}`;

  const title = `${position.side.toUpperCase()} on ${position.marketTitle} | ${pnlStr} (${pnlPctStr}%)`;
  const description = `${entryPrice}¢ → ${nowPrice}¢ | Stake: $${position.costBasis.toFixed(2)} | Payout: $${position.shares.toFixed(2)}`;

  const ogUrl = new URL('/api/og/position', 'https://singl.market');
  ogUrl.searchParams.set('market', position.marketTitle);
  ogUrl.searchParams.set('event', position.eventTitle);
  ogUrl.searchParams.set('side', position.side);
  ogUrl.searchParams.set('entry', String(entryPrice));
  ogUrl.searchParams.set('current', String(nowPrice));
  ogUrl.searchParams.set('pnl', pnlStr);
  ogUrl.searchParams.set('pnlPct', pnlPctStr);
  ogUrl.searchParams.set('stake', `$${position.costBasis.toFixed(2)}`);
  ogUrl.searchParams.set('payout', `$${position.shares.toFixed(2)}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
      siteName: 'SINGL by Spredd Markets',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl.toString()],
      site: '@singlmarket',
    },
  };
}

export default async function SharePositionPage({ params }: Props) {
  const { id } = await params;
  const position = await prisma.position.findUnique({ where: { id } });

  if (!position) {
    redirect('/');
  }

  // Redirect to the event page — this page exists only for meta tags
  redirect(`/event/${position.eventSlug}`);
}
