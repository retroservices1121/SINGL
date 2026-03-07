import { NextRequest, NextResponse } from 'next/server';
import { fetchEventXPosts } from '@/app/lib/virtuals';
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

    const posts = await fetchEventXPosts(event.searchTerms);

    for (const post of posts) {
      if (!post.tweetId) continue;

      await prisma.xPost.upsert({
        where: { tweetId: post.tweetId },
        update: { likes: post.likes, retweets: post.retweets },
        create: {
          eventId: event.id,
          tweetId: post.tweetId,
          name: post.name,
          handle: post.handle,
          text: post.text,
          time: post.time,
          likes: post.likes,
          retweets: post.retweets,
        },
      });
    }
  }

  return NextResponse.json({ success: true, eventsProcessed: events.length });
}
