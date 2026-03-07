import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });

  if (!config) {
    return NextResponse.json({ event: null });
  }

  const event = await prisma.event.findUnique({
    where: { slug: config.value },
    include: {
      markets: true,
      newsItems: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      xPosts: { orderBy: { fetchedAt: 'desc' }, take: 20 },
      videos: { orderBy: { fetchedAt: 'desc' }, take: 8 },
    },
  });

  return NextResponse.json({ event });
}
