// ── SPRDD reward distributor (Base) ──────────────────────────────────────────
// Server-side hot wallet that holds the bought-back SPRDD and transfers each
// player's vested rewards on claim. Custodial by design (simplest payout rail
// for a micro reward program); the private key lives only in server env.
//
// Set DISTRIBUTOR_PRIVATE_KEY to the funded buyback wallet. If unset, claims are
// disabled (the API returns a clear error rather than crashing).

import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { SPRDD_ADDRESS } from './oracle';

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

function getAccount() {
  const key = process.env.DISTRIBUTOR_PRIVATE_KEY;
  if (!key) return null;
  const normalized = (key.startsWith('0x') ? key : `0x${key}`) as Hex;
  return privateKeyToAccount(normalized);
}

export function distributorEnabled(): boolean {
  return !!process.env.DISTRIBUTOR_PRIVATE_KEY;
}

export function distributorAddress(): string | null {
  const acct = getAccount();
  return acct ? acct.address : null;
}

const publicClient = createPublicClient({ chain: base, transport: http(RPC) });

/** Distributor's current SPRDD balance (raw), to guard against overdraw. */
export async function distributorBalance(): Promise<bigint> {
  const acct = getAccount();
  if (!acct) return 0n;
  return (await publicClient.readContract({
    address: getAddress(SPRDD_ADDRESS),
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [acct.address],
  })) as bigint;
}

/**
 * Broadcast an SPRDD transfer and return the tx hash. Throws BEFORE any
 * broadcast if the distributor is unconfigured/underfunded — so the caller can
 * safely revert a DB reservation on throw. Once this returns a hash, the tx is
 * on the wire: never revert the reservation, use confirmTransfer to resolve it.
 */
export async function submitTransfer(to: string, amountRaw: bigint): Promise<string> {
  const acct = getAccount();
  if (!acct) throw new Error('Distributor wallet not configured');
  if (amountRaw <= 0n) throw new Error('Nothing to send');

  const balance = await distributorBalance();
  if (balance < amountRaw) {
    throw new Error('Distributor balance too low — fund the buyback wallet');
  }

  const walletClient = createWalletClient({ account: acct, chain: base, transport: http(RPC) });
  return walletClient.writeContract({
    address: getAddress(SPRDD_ADDRESS),
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [getAddress(to), amountRaw],
  });
}

/** Wait for a broadcast transfer's receipt: 'success' | 'reverted'. */
export async function confirmTransfer(txHash: string): Promise<'success' | 'reverted'> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });
  return receipt.status === 'success' ? 'success' : 'reverted';
}
