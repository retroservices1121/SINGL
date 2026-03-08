import { NextRequest, NextResponse } from 'next/server';
import { fetchEventVideos } from '@/app/lib/youtube';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = req.nextUrl.searchParams.get('secret');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only fetch for the active event
  const config = await prisma.siteConfig.findUnique({ where: { key: 'activeEventSlug' } });
  if (!config) {
    return NextResponse.json({ error: 'No active event' }, { status: 404 });
  }

  const event = await prisma.event.findUnique({ where: { slug: config.value } });
  if (!event || event.searchTerms.length === 0) {
    return NextResponse.json({ error: 'Event not found or no search terms' }, { status: 404 });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY not set' }, { status: 500 });
  }

  try {
    const videos = await fetchEventVideos(event.searchTerms);
    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        event: event.title,
        searchTerms: event.searchTerms,
        created: 0,
        updated: 0,
        total: 0,
        note: 'No videos found. Try updating search terms in admin.',
      });
    }
    let created = 0;
    let updated = 0;

    for (const video of videos) {
      if (video.youtubeId) {
        const existing = await prisma.video.findFirst({
          where: { youtubeId: video.youtubeId, eventId: event.id },
        });
        if (existing) {
          await prisma.video.update({
            where: { id: existing.id },
            data: { views: video.views },
          });
          updated++;
          continue;
        }
      }

      await prisma.video.create({
        data: {
          eventId: event.id,
          title: video.title,
          channel: video.channel,
          youtubeUrl: video.youtubeUrl,
          youtubeId: video.youtubeId,
          duration: video.duration,
          views: video.views,
          thumbnail: video.thumbnail,
        },
      });
      created++;
    }

    return NextResponse.json({ success: true, event: event.title, created, updated, total: videos.length });
  } catch (err) {
    console.error('YouTube cron error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
