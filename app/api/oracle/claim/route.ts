import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getOrCreatePlayer } from '@/app/lib/oracleServer';
import { claimableRaw } from '@/app/lib/oracle';
import {
  distributorEnabled,
  distributorAddress,
  submitTransfer,
  confirmTransfer,
} from '@/app/lib/distributor';

export const dynamic = 'force-dynamic';

const LOCK_STALE_MS = 5 * 60 * 1000; // a held lock older than this is abandoned

// GET /api/oracle/claim?aggUserId=... — claimable summary across all periods.
export async function GET(req: NextRequest) {
  const aggUserId = req.nextUrl.searchParams.get('aggUserId');
  if (!aggUserId) return NextResponse.json({ error: 'aggUserId required' }, { status: 400 });

  const player = await prisma.oraclePlayer.findUnique({
    where: { aggUserId },
    select: { id: true, walletAddress: true },
  });
  if (!player) {
    return NextResponse.json({ enabled: distributorEnabled(), claimableRaw: '0', periods: [] });
  }

  const allocations = await prisma.rewardAllocation.findMany({ where: { playerId: player.id } });
  const now = Date.now();
  let total = 0n;
  const periods = allocations.map(a => {
    const claimable = claimableRaw(a.sprddAmount, a.claimedRaw, a.vestStart.getTime(), a.vestEnd.getTime(), now);
    total += claimable;
    return {
      periodKey: a.periodKey,
      sprddAmount: a.sprddAmount,
      claimedRaw: a.claimedRaw,
      claimableRaw: claimable.toString(),
      vestStart: a.vestStart,
      vestEnd: a.vestEnd,
      fullyVested: now >= a.vestEnd.getTime(),
    };
  });

  return NextResponse.json({
    enabled: distributorEnabled(),
    distributor: distributorAddress(),
    walletAddress: player.walletAddress,
    claimableRaw: total.toString(),
    periods,
  });
}

// POST /api/oracle/claim { aggUserId, walletAddress }
// Claims all currently-vested SPRDD to the player's connected wallet. Guarded by
// a per-player lock; reserves the amount in the DB before broadcasting so a
// crash/retry can never double-pay.
export async function POST(req: NextRequest) {
  if (!distributorEnabled()) {
    return NextResponse.json({ error: 'Claims are not live yet' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const aggUserId = body?.aggUserId as string | undefined;
  const walletAddress = (body?.walletAddress as string | undefined)?.toLowerCase();
  if (!aggUserId || !walletAddress) {
    return NextResponse.json({ error: 'aggUserId and walletAddress required' }, { status: 400 });
  }

  const player = await getOrCreatePlayer(aggUserId, { walletAddress });

  // Recipient safety: only pay the wallet on record for this player.
  if (player.walletAddress && player.walletAddress !== walletAddress) {
    return NextResponse.json({ error: 'Wallet does not match your account' }, { status: 403 });
  }

  // ── Acquire the per-player claim lock (atomic conditional update) ──
  const lockCutoff = new Date(Date.now() - LOCK_STALE_MS);
  const lock = await prisma.oraclePlayer.updateMany({
    where: { id: player.id, OR: [{ claimLockedAt: null }, { claimLockedAt: { lt: lockCutoff } }] },
    data: { claimLockedAt: new Date() },
  });
  if (lock.count !== 1) {
    return NextResponse.json({ error: 'A claim is already in progress' }, { status: 409 });
  }

  try {
    const allocations = await prisma.rewardAllocation.findMany({ where: { playerId: player.id } });
    const now = Date.now();

    // Per-allocation claimable, so we can reserve and (if needed) revert exactly.
    const reservations = allocations
      .map(a => ({
        id: a.id,
        prevClaimed: a.claimedRaw,
        claimable: claimableRaw(a.sprddAmount, a.claimedRaw, a.vestStart.getTime(), a.vestEnd.getTime(), now),
      }))
      .filter(r => r.claimable > 0n);

    const total = reservations.reduce((s, r) => s + r.claimable, 0n);
    if (total <= 0n) {
      return NextResponse.json({ error: 'Nothing to claim yet' }, { status: 400 });
    }

    // ── Reserve in the DB (increment claimedRaw) + open a claim record ──
    const claim = await prisma.$transaction(async tx => {
      for (const r of reservations) {
        await tx.rewardAllocation.update({
          where: { id: r.id },
          data: { claimedRaw: (BigInt(r.prevClaimed) + r.claimable).toString() },
        });
      }
      return tx.oracleClaim.create({
        data: { playerId: player.id, wallet: walletAddress, amountRaw: total.toString(), status: 'pending' },
      });
    });

    // ── Broadcast. A throw HERE means no broadcast → safe to revert. ──
    let txHash: string;
    try {
      txHash = await submitTransfer(walletAddress, total);
    } catch (err) {
      await prisma.$transaction(async tx => {
        for (const r of reservations) {
          await tx.rewardAllocation.update({ where: { id: r.id }, data: { claimedRaw: r.prevClaimed } });
        }
        await tx.oracleClaim.update({
          where: { id: claim.id },
          data: { status: 'failed', error: (err as Error).message?.slice(0, 300) },
        });
      });
      return NextResponse.json({ error: (err as Error).message || 'Transfer failed' }, { status: 502 });
    }

    // Tx is on-chain now: record the hash, then resolve the receipt. We never
    // revert past this point — a reverted tx moved no funds, so we only undo on
    // an explicit 'reverted' status.
    await prisma.oracleClaim.update({ where: { id: claim.id }, data: { txHash } });

    let status: 'success' | 'reverted' | 'pending' = 'pending';
    try {
      status = await confirmTransfer(txHash);
    } catch {
      // Receipt not seen in time — leave pending with the hash for reconciliation.
      return NextResponse.json({ status: 'pending', txHash, amountRaw: total.toString() });
    }

    if (status === 'reverted') {
      await prisma.$transaction(async tx => {
        for (const r of reservations) {
          await tx.rewardAllocation.update({ where: { id: r.id }, data: { claimedRaw: r.prevClaimed } });
        }
        await tx.oracleClaim.update({ where: { id: claim.id }, data: { status: 'failed', error: 'tx reverted' } });
      });
      return NextResponse.json({ error: 'Transaction reverted', txHash }, { status: 502 });
    }

    await prisma.oracleClaim.update({ where: { id: claim.id }, data: { status: 'confirmed' } });
    return NextResponse.json({ status: 'confirmed', txHash, amountRaw: total.toString() });
  } finally {
    await prisma.oraclePlayer.update({ where: { id: player.id }, data: { claimLockedAt: null } });
  }
}
