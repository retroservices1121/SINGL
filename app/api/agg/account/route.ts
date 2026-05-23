import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

// POST /api/agg/account  body: { aggUserId, walletAddress? }
// Persists a thin AGG user -> wallet mapping so server routes can resolve
// wallets without re-querying AGG every call.
export async function POST(req: Request) {
  try {
    const { aggUserId, walletAddress } = await req.json();
    if (!aggUserId) return NextResponse.json({ error: 'aggUserId is required' }, { status: 400 });

    const account = await prisma.aggAccount.upsert({
      where: { aggUserId },
      update: { walletAddress: walletAddress ?? null },
      create: { aggUserId, walletAddress: walletAddress ?? null },
    });

    return NextResponse.json({ account });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'account upsert failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
