import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import {
  createSynthesisAccount,
  createAccountApiKey,
  getSynthesisWallet,
} from '@/app/lib/synthesis';

export const dynamic = 'force-dynamic';

/**
 * POST /api/synthesis/account
 *
 * Creates or retrieves a Synthesis account for the current Privy user.
 * Body: { privy_user_id: string }
 * Returns: { account_id, wallet_id, wallet_address, api_key (public_key only) }
 *
 * The secret API key is stored in the DB and never sent to the client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { privy_user_id } = body;

    if (!privy_user_id) {
      return NextResponse.json(
        { error: 'privy_user_id is required' },
        { status: 400 },
      );
    }

    // Check if we already have a Synthesis account for this Privy user
    let existing = await prisma.synthesisAccount.findUnique({
      where: { privyUserId: privy_user_id },
    });

    if (existing) {
      // If wallet info is missing, try to fetch it now
      if (!existing.walletId || !existing.walletAddress) {
        try {
          const wallet = await getSynthesisWallet(existing.apiKey);
          const walletAddress = wallet.chains?.POL?.address || null;
          existing = await prisma.synthesisAccount.update({
            where: { id: existing.id },
            data: {
              walletId: wallet.wallet_id,
              walletAddress,
            },
          });
        } catch (walletErr) {
          console.error('[synthesis] Failed to fetch wallet for existing account:', walletErr);
        }
      }

      return NextResponse.json({
        account_id: existing.accountId,
        wallet_id: existing.walletId,
        wallet_address: existing.walletAddress,
        ready: !!existing.walletId,
      });
    }

    // Step 1: Create Synthesis account
    console.log('[synthesis] Creating account for privy user:', privy_user_id);
    const account = await createSynthesisAccount(privy_user_id);
    const accountId = account.account_id;

    // Step 2: Create API key for the account
    console.log('[synthesis] Creating API key for account:', accountId);
    const apiKeyResult = await createAccountApiKey(accountId);
    const secretKey = apiKeyResult.secret_key;

    // Step 3: Get or create wallet
    let walletId: string | null = null;
    let walletAddress: string | null = null;
    try {
      const wallet = await getSynthesisWallet(secretKey);
      walletId = wallet.wallet_id;
      walletAddress = wallet.chains?.POL?.address || null;
      console.log('[synthesis] Wallet created:', walletId, 'address:', walletAddress);
    } catch (walletErr) {
      console.error('[synthesis] Wallet creation failed (will retry later):', walletErr);
    }

    // Step 4: Store in DB
    await prisma.synthesisAccount.create({
      data: {
        privyUserId: privy_user_id,
        accountId,
        apiKey: secretKey,
        walletId,
        walletAddress,
      },
    });

    return NextResponse.json({
      account_id: accountId,
      wallet_id: walletId,
      wallet_address: walletAddress,
      ready: !!walletId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create Synthesis account';
    console.error('[synthesis] Account error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
