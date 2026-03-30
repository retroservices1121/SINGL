import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

// GET: fetch profiles for multiple wallet addresses (for leaderboard)
export async function GET(req: NextRequest) {
  const wallets = req.nextUrl.searchParams.get('wallets');
  if (!wallets) {
    return NextResponse.json({ profiles: {} });
  }

  const addresses = wallets.split(',').filter(Boolean);
  const profiles = await prisma.userProfile.findMany({
    where: { walletAddress: { in: addresses } },
    select: {
      walletAddress: true,
      displayName: true,
      avatarUrl: true,
      twitterHandle: true,
      twitterAvatar: true,
    },
  });

  // Map by wallet address for easy lookup
  const map: Record<string, typeof profiles[0]> = {};
  for (const p of profiles) {
    if (p.walletAddress) map[p.walletAddress] = p;
  }

  return NextResponse.json({ profiles: map });
}
