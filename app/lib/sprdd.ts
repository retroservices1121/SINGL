// ── SPRDD on-chain reads (Base) ──────────────────────────────────────────────
// Reads a wallet's SPRDD balance via a public viem client and derives the
// hold-to-multiply tier. viem is already a project dependency (used by wagmi).

import { createPublicClient, http, getAddress } from 'viem';
import { base } from 'viem/chains';
import { SPRDD_ADDRESS, multiplierForBalance } from './oracle';

const ERC20_BALANCE_OF = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Allow a custom RPC (Alchemy/Infura) via env; fall back to the public node.
const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

export interface SprddHolding {
  raw: string; // balance in raw units (18 decimals)
  multiplierBps: number;
}

/** Read SPRDD balance for a wallet and resolve its multiplier. */
export async function readSprddHolding(wallet: string): Promise<SprddHolding> {
  try {
    const balance = (await client.readContract({
      address: getAddress(SPRDD_ADDRESS),
      abi: ERC20_BALANCE_OF,
      functionName: 'balanceOf',
      args: [getAddress(wallet)],
    })) as bigint;
    const raw = balance.toString();
    return { raw, multiplierBps: multiplierForBalance(raw) };
  } catch (err) {
    console.error('[sprdd] readSprddHolding failed:', err);
    return { raw: '0', multiplierBps: 10000 };
  }
}
