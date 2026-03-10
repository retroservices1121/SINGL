import { NextRequest, NextResponse } from 'next/server';
import { buildTradeTransaction, buildSellTransaction } from '@/app/lib/dflow';
import { calculateFee, TREASURY_WALLET, USDC_MINT, USDC_DECIMALS } from '@/app/lib/fees';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

export const dynamic = 'force-dynamic';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

async function buildFeeTransaction(walletAddress: string, feeAmount: number): Promise<string | null> {
  if (feeAmount <= 0) return null;

  const connection = new Connection(RPC_URL);
  const payer = new PublicKey(walletAddress);
  const treasury = new PublicKey(TREASURY_WALLET);
  const usdcMint = new PublicKey(USDC_MINT);

  // Get associated token accounts for USDC
  const payerAta = await getAssociatedTokenAddress(usdcMint, payer);
  const treasuryAta = await getAssociatedTokenAddress(usdcMint, treasury);

  // Fee in smallest unit (6 decimals)
  const feeInSmallest = BigInt(Math.round(feeAmount * 10 ** USDC_DECIMALS));

  const tx = new Transaction();

  // Check if treasury ATA exists, if not create it
  const treasuryAccount = await connection.getAccountInfo(treasuryAta);
  if (!treasuryAccount) {
    const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer,       // payer
        treasuryAta, // ata
        treasury,    // owner
        usdcMint,    // mint
      )
    );
  }

  tx.add(
    createTransferCheckedInstruction(
      payerAta,      // source
      usdcMint,      // mint
      treasuryAta,   // destination
      payer,         // owner
      feeInSmallest, // amount
      USDC_DECIMALS, // decimals
    )
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  // Serialize as base64 (legacy Transaction, not VersionedTransaction)
  const serialized = tx.serialize({ requireAllSignatures: false });
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

    const transaction = await buildTradeTransaction({
      walletAddress,
      marketTicker,
      side,
      amount: netAmount,
    });

    // Build fee transfer transaction
    const feeTransaction = await buildFeeTransaction(walletAddress, fee);

    return NextResponse.json({ transaction, feeTransaction, fee, netAmount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to build transaction';
    console.error('Trade build error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
