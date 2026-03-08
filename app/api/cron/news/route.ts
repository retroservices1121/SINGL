import { NextRequest, NextResponse } from 'next/server';
import { fetchEventNews } from '@/app/lib/news';
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
    const articles = await fetchEventNews(event.searchTerms);
    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        event: event.title,
        searchTerms: event.searchTerms,
        created: 0,
        total: 0,
        note: 'No news articles found. Try updating search terms.',
      });
    }

    let created = 0;

    for (const article of articles) {
      // Check for duplicate by title (rough match)
      const existing = await prisma.newsItem.findFirst({
        where: {
          eventId: event.id,
          title: article.title,
        },
      });

      if (!existing) {
        await prisma.newsItem.create({
          data: {
            eventId: event.id,
            title: article.title,
            summary: article.summary || `${article.source} — ${article.time}`,
            source: article.source,
            sentiment: article.sentiment,
            time: article.time,
            url: article.url,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      event: event.title,
      searchTerms: event.searchTerms,
      created,
      total: articles.length,
    });
  } catch (err) {
    console.error('News cron error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
