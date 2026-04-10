import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { createLimitlessPartnerAccount } from '@/app/lib/spredd';

export const dynamic = 'force-dynamic';

/**
 * POST: Create or retrieve a Spredd/Limitless trading account for a Privy user.
 * Creates a Limitless partner account with a server-managed wallet.
 * Stores credentials in DB, never returns sensitive keys to client.
 */
export async function POST(req: NextRequest) {
  try {
    const { privy_user_id } = await req.json();
    if (!privy_user_id) {
      return NextResponse.json({ error: 'privy_user_id is required' }, { status: 400 });
    }

    // Check for existing account
    const existing = await prisma.spreddAccount.findUnique({
      where: { privyUserId: privy_user_id },
    });

    if (existing) {
      return NextResponse.json({
        account_id: existing.spreddAccountId,
        wallet_address: existing.walletAddress,
        ready: !!existing.walletAddress,
      });
    }

    // Create Limitless partner account with server wallet
    const result = await createLimitlessPartnerAccount(privy_user_id, true);

    const accountId = String(result.account_id || result.user_id || privy_user_id);
    const walletAddress = String(result.wallet_address || result.address || '');
    const apiKey = String(result.api_key || result.secret_key || '');

    const record = await prisma.spreddAccount.upsert({
      where: { privyUserId: privy_user_id },
      update: {
        walletAddress: walletAddress || undefined,
      },
      create: {
        privyUserId: privy_user_id,
        spreddAccountId: accountId,
        apiKey: apiKey,
        walletAddress: walletAddress || null,
      },
    });

    return NextResponse.json({
      account_id: record.spreddAccountId,
      wallet_address: record.walletAddress,
      ready: !!record.walletAddress,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create Spredd account';
    console.error('[spredd] Account error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
