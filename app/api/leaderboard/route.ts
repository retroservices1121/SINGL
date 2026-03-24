import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Aggregate positions by wallet address to build leaderboard
    // Rank by total volume (costBasis = amount wagered per position)
    const positions = await prisma.position.groupBy({
      by: ['walletAddress'],
      _sum: {
        costBasis: true,
        realizedPnl: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          costBasis: 'desc',
        },
      },
      take: 100,
    });

    // Also get win rate per wallet
    const leaders = await Promise.all(
      positions.map(async (p, index) => {
        const closedPositions = await prisma.position.count({
          where: { walletAddress: p.walletAddress, status: 'closed' },
        });
        const wonPositions = await prisma.position.count({
          where: {
            walletAddress: p.walletAddress,
            status: 'closed',
            realizedPnl: { gt: 0 },
          },
        });

        return {
          rank: index + 1,
          walletAddress: p.walletAddress,
          totalVolume: p._sum.costBasis || 0,
          totalPnl: p._sum.realizedPnl || 0,
          tradeCount: p._count.id,
          winRate: closedPositions > 0 ? wonPositions / closedPositions : 0,
        };
      })
    );

    return NextResponse.json({ leaders });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ leaders: [] });
  }
}
