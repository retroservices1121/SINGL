import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
  }

  const positions = await prisma.position.findMany({
    where: { walletAddress: wallet },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ positions });
}
