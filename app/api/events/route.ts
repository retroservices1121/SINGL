import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: { markets: true },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, title, subtitle, emoji, color, searchTerms } = body;

  if (!slug || !title) {
    return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      slug,
      title,
      subtitle: subtitle || null,
      emoji: emoji || null,
      color: color || null,
      searchTerms: searchTerms || [],
    },
  });

  return NextResponse.json(event, { status: 201 });
}
