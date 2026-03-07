import { NextRequest, NextResponse } from 'next/server';
import { fetchEventVideos } from '@/app/lib/youtube';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await prisma.event.findMany();

  for (const event of events) {
    if (event.searchTerms.length === 0) continue;

    const videos = await fetchEventVideos(event.searchTerms);

    for (const video of videos) {
      // Check if video already exists by youtubeId
      if (video.youtubeId) {
        const existing = await prisma.video.findFirst({
          where: { youtubeId: video.youtubeId, eventId: event.id },
        });
        if (existing) {
          await prisma.video.update({
            where: { id: existing.id },
            data: { views: video.views },
          });
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
    }
  }

  return NextResponse.json({ success: true, eventsProcessed: events.length });
}
