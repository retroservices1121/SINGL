import { NextRequest, NextResponse } from 'next/server';
import { fetchEventTikToks } from '@/app/lib/tiktok';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) {
    return NextResponse.json({ error: 'No active event' }, { status: 404 });
  }

  const event = await prisma.event.findUnique({ where: { slug: config.value } });
  if (!event || event.searchTerms.length === 0) {
    return NextResponse.json({ error: 'Event not found or no search terms' }, { status: 404 });
  }

  try {
    const tiktoks = await fetchEventTikToks(event.searchTerms);
    if (tiktoks.length === 0) {
      return NextResponse.json({
        success: true,
        event: event.title,
        searchTerms: event.searchTerms,
        created: 0,
        updated: 0,
        total: 0,
        note: 'No TikTok videos found.',
      });
    }

    let created = 0;
    let updated = 0;

    for (const tt of tiktoks) {
      const videoId = tt.videoId || `tt-${Buffer.from(tt.videoUrl).toString('base64url').slice(0, 32)}`;

      const existing = await prisma.tikTok.findUnique({ where: { videoId } });
      if (existing) {
        await prisma.tikTok.update({
          where: { videoId },
          data: { likes: tt.likes, views: tt.views },
        });
        updated++;
      } else {
        await prisma.tikTok.create({
          data: {
            eventId: event.id,
            videoId,
            username: tt.username,
            caption: tt.caption,
            thumbnail: tt.thumbnail,
            videoUrl: tt.videoUrl,
            likes: tt.likes,
            views: tt.views,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ success: true, event: event.title, created, updated, total: tiktoks.length });
  } catch (err) {
    console.error('TikTok cron error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
