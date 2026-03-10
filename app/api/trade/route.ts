import { NextRequest, NextResponse } from 'next/server';
import { buildTradeTransaction, buildSellTransaction } from '@/app/lib/dflow';
import { calculateFee, TREASURY_WALLET, USDC_MINT, USDC_DECIMALS } from '@/app/lib/fees';
import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

export const dynamic = 'force-dynamic';

// Server-side RPC: check runtime env vars (SOLANA_RPC without NEXT_PUBLIC_ works at runtime)
const RPC_URL = process.env.SOLANA_RPC
  || process.env.NEXT_PUBLIC_SOLANA_RPC
  || process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || 'https://api.mainnet-beta.solana.com';

async function buildFeeTransaction(walletAddress: string, feeAmount: number): Promise<string | null> {
  if (feeAmount <= 0) return null;

  console.log(`[fee] Building fee tx: ${feeAmount} USDC from ${walletAddress} to ${TREASURY_WALLET}`);
  console.log(`[fee] Using RPC: ${RPC_URL.slice(0, 50)}...`);

  const connection = new Connection(RPC_URL);
  const payer = new PublicKey(walletAddress);
  const treasury = new PublicKey(TREASURY_WALLET);
  const usdcMint = new PublicKey(USDC_MINT);

  const payerAta = await getAssociatedTokenAddress(usdcMint, payer);
  const treasuryAta = await getAssociatedTokenAddress(usdcMint, treasury);

  console.log(`[fee] Payer ATA: ${payerAta.toBase58()}`);
  console.log(`[fee] Treasury ATA: ${treasuryAta.toBase58()}`);

  const feeInSmallest = BigInt(Math.round(feeAmount * 10 ** USDC_DECIMALS));

  const tx = new Transaction();

  // Check if treasury ATA exists, if not create it
  const treasuryAccount = await connection.getAccountInfo(treasuryAta);
  if (!treasuryAccount) {
    console.log('[fee] Treasury ATA does not exist, adding create instruction');
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer,
        treasuryAta,
        treasury,
        usdcMint,
      )
    );
  }

  tx.add(
    createTransferCheckedInstruction(
      payerAta,
      usdcMint,
      treasuryAta,
      payer,
      feeInSmallest,
      USDC_DECIMALS,
    )
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  const serialized = tx.serialize({ requireAllSignatures: false });
  console.log(`[fee] Fee tx built successfully (${serialized.length} bytes)`);
  return Buffer.from(serialized).toString('base64');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress, marketTicker, side, amount, action } = body;

  if (!walletAddress || !marketTicker || !side || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    if (action === 'sell') {
      const transaction = await buildSellTransaction({
        walletAddress,
        marketTicker,
        side,
        amount,
      });
      return NextResponse.json({ transaction });
    }

    // Buy: apply fee
    const { fee, netAmount } = calculateFee(amount);
    console.log(`[trade] Amount: ${amount}, Fee: ${fee}, Net: ${netAmount}`);

    const transaction = await buildTradeTransaction({
      walletAddress,
      marketTicker,
      side,
      amount: netAmount,
    });

    // Build fee transfer transaction (don't let fee failure block the trade)
    let feeTransaction: string | null = null;
    try {
      feeTransaction = await buildFeeTransaction(walletAddress, fee);
    } catch (feeErr) {
      console.error('[fee] Failed to build fee tx:', feeErr instanceof Error ? feeErr.message : feeErr);
      // Trade still proceeds without fee
    }

    console.log(`[trade] Returning trade tx + fee tx (fee tx: ${feeTransaction ? 'yes' : 'no'})`);
    return NextResponse.json({ transaction, feeTransaction, fee, netAmount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to build transaction';
    console.error('Trade build error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
