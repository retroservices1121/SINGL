import { NextRequest, NextResponse } from 'next/server';
import { buildTradeTransaction, buildSellTransaction } from '@/app/lib/dflow';
import { calculateFee, TREASURY_WALLET, USDC_MINT, USDC_DECIMALS } from '@/app/lib/fees';
import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

export const dynamic = 'force-dynamic';

const RPC_URL = process.env.SOLANA_RPC
  || process.env.NEXT_PUBLIC_SOLANA_RPC
  || process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || 'https://api.mainnet-beta.solana.com';

function buildFeeInstructions(
  payer: PublicKey,
  payerAta: PublicKey,
  treasuryAta: PublicKey,
  feeAmount: number,
  createAta: boolean,
): TransactionInstruction[] {
  const treasury = new PublicKey(TREASURY_WALLET);
  const usdcMint = new PublicKey(USDC_MINT);
  const feeInSmallest = BigInt(Math.round(feeAmount * 10 ** USDC_DECIMALS));
  const instructions: TransactionInstruction[] = [];

  if (createAta) {
    instructions.push(
      createAssociatedTokenAccountInstruction(payer, treasuryAta, treasury, usdcMint)
    );
  }

  instructions.push(
    createTransferCheckedInstruction(payerAta, usdcMint, treasuryAta, payer, feeInSmallest, USDC_DECIMALS)
  );

  return instructions;
}

async function injectFeeIntoTransaction(
  txBase64: string,
  walletAddress: string,
  feeAmount: number,
): Promise<string> {
  if (feeAmount <= 0) return txBase64;

  const connection = new Connection(RPC_URL);
  const payer = new PublicKey(walletAddress);
  const usdcMint = new PublicKey(USDC_MINT);
  const treasury = new PublicKey(TREASURY_WALLET);

  // Get ATAs
  const payerAta = await getAssociatedTokenAddress(usdcMint, payer);
  const treasuryAta = await getAssociatedTokenAddress(usdcMint, treasury);

  // Check if treasury ATA exists
  const treasuryAccount = await connection.getAccountInfo(treasuryAta);
  const createAta = !treasuryAccount;

  console.log(`[fee] Injecting fee: ${feeAmount} USDC, create ATA: ${createAta}`);

  // Build fee instructions
  const feeInstructions = buildFeeInstructions(payer, payerAta, treasuryAta, feeAmount, createAta);

  // Deserialize the DFlow versioned transaction
  const txBuffer = Buffer.from(txBase64, 'base64');
  const originalTx = VersionedTransaction.deserialize(txBuffer);

  // Fetch address lookup tables used by the original transaction
  const lookupTableAccounts = await Promise.all(
    originalTx.message.addressTableLookups.map(async (lookup) => {
      const result = await connection.getAddressLookupTable(lookup.accountKey);
      return result.value;
    })
  );
  const validLookupTables = lookupTableAccounts.filter(
    (t): t is NonNullable<typeof t> => t !== null
  );

  // Decompile the original message to get instructions
  const originalMessage = TransactionMessage.decompile(originalTx.message, {
    addressLookupTableAccounts: validLookupTables,
  });

  // Prepend fee instructions (fee first, then trade)
  const allInstructions = [...feeInstructions, ...originalMessage.instructions];

  // Get fresh blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  // Recompile with all instructions
  const newMessage = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(validLookupTables);

  const newTx = new VersionedTransaction(newMessage);
  const serialized = Buffer.from(newTx.serialize()).toString('base64');

  console.log(`[fee] Injected fee into transaction (${allInstructions.length} instructions total)`);
  return serialized;
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

    const dflowResult = await buildTradeTransaction({
      walletAddress,
      marketTicker,
      side,
      amount: netAmount,
    });

    // Inject fee transfer into the DFlow transaction
    let finalTxBase64 = dflowResult.transaction;
    try {
      finalTxBase64 = await injectFeeIntoTransaction(dflowResult.transaction, walletAddress, fee);
    } catch (feeErr) {
      console.error('[fee] Failed to inject fee:', feeErr instanceof Error ? feeErr.message : feeErr);
      // Fall back to original DFlow tx without fee
    }

    return NextResponse.json({
      transaction: { ...dflowResult, transaction: finalTxBase64 },
      fee,
      netAmount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to build transaction';
    console.error('Trade build error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
