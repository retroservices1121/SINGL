import { NextRequest, NextResponse } from 'next/server';
import { fetchEventXPosts } from '@/app/lib/virtuals';
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

  try {
    const posts = await fetchEventXPosts(event.searchTerms);
    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        event: event.title,
        searchTerms: event.searchTerms,
        created: 0,
        updated: 0,
        total: 0,
        note: 'No posts found. Try updating search terms in admin.',
      });
    }
    let created = 0;
    let updated = 0;

    for (const post of posts) {
      // Generate a stable ID from text if no real tweetId
      const tweetId = post.tweetId && !post.tweetId.startsWith('google-')
        ? post.tweetId
        : `x-${Buffer.from(post.text.slice(0, 80)).toString('base64url').slice(0, 32)}`;

      const existing = await prisma.xPost.findUnique({ where: { tweetId } });
      if (existing) {
        await prisma.xPost.update({
          where: { tweetId },
          data: { likes: post.likes, retweets: post.retweets },
        });
        updated++;
      } else {
        await prisma.xPost.create({
          data: {
            eventId: event.id,
            tweetId,
            name: post.name,
            handle: post.handle,
            text: post.text,
            time: post.time,
            likes: post.likes,
            retweets: post.retweets,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ success: true, event: event.title, created, updated, total: posts.length });
  } catch (err) {
    console.error('Twitter cron error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
