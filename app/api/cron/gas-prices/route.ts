import { NextRequest, NextResponse } from 'next/server';
import { fetchGasPrices } from '@/app/lib/gas-prices';
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
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  try {
    const prices = await fetchGasPrices();
    if (prices.length === 0) {
      return NextResponse.json({
        success: true,
        event: event.title,
        created: 0,
        total: 0,
        note: 'No gas price data returned from EIA. Check API key.',
      });
    }

    let created = 0;

    for (const entry of prices) {
      const weekOf = new Date(entry.weekOf);

      // Upsert to avoid duplicates (unique on eventId + region + grade + weekOf)
      await prisma.gasPrice.upsert({
        where: {
          eventId_region_grade_weekOf: {
            eventId: event.id,
            region: entry.region,
            grade: entry.grade,
            weekOf,
          },
        },
        update: {
          price: entry.price,
        },
        create: {
          eventId: event.id,
          region: entry.region,
          grade: entry.grade,
          price: entry.price,
          weekOf,
        },
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      event: event.title,
      created,
      total: prices.length,
    });
  } catch (err) {
    console.error('Gas prices cron error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
