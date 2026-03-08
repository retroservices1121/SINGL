import { NextRequest, NextResponse } from 'next/server';
import { fetchEventInstaPosts } from '@/app/lib/instagram';
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
    const posts = await fetchEventInstaPosts(event.searchTerms);
    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        event: event.title,
        searchTerms: event.searchTerms,
        created: 0,
        updated: 0,
        total: 0,
        note: 'No Instagram posts found.',
      });
    }

    let created = 0;
    let updated = 0;

    for (const post of posts) {
      const postId = post.postId || `ig-${Buffer.from(post.permalink).toString('base64url').slice(0, 32)}`;

      const existing = await prisma.instaPost.findUnique({ where: { postId } });
      if (existing) {
        await prisma.instaPost.update({
          where: { postId },
          data: { likes: post.likes },
        });
        updated++;
      } else {
        await prisma.instaPost.create({
          data: {
            eventId: event.id,
            postId,
            username: post.username,
            caption: post.caption,
            imageUrl: post.imageUrl,
            permalink: post.permalink,
            likes: post.likes,
            timestamp: post.timestamp,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ success: true, event: event.title, created, updated, total: posts.length });
  } catch (err) {
    console.error('Instagram cron error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
