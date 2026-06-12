// ── SPREDD Oracle — server-side DB helpers ───────────────────────────────────
import { prisma } from './db';
import { applyBps, tradeBasePoints } from './oracle';

/** Fetch or lazily create the Oracle player for an AGG user. */
export async function getOrCreatePlayer(
  aggUserId: string,
  opts: { walletAddress?: string | null; displayName?: string | null } = {}
) {
  const player = await prisma.oraclePlayer.upsert({
    where: { aggUserId },
    update: {
      ...(opts.walletAddress !== undefined && opts.walletAddress !== null
        ? { walletAddress: opts.walletAddress.toLowerCase() }
        : {}),
      ...(opts.displayName ? { displayName: opts.displayName } : {}),
    },
    create: {
      aggUserId,
      walletAddress: opts.walletAddress ? opts.walletAddress.toLowerCase() : null,
      displayName: opts.displayName ?? null,
    },
  });
  return player;
}

/**
 * Trade-to-earn credit. Given a player's CUMULATIVE traded volume (USD),
 * credit points for any newly-earned base points since the last sync, scaled
 * by their current hold multiplier — mirroring how match points are awarded.
 *
 * Idempotent on cumulative volume: the base-point delta is computed from the
 * stored vs. incoming cumulative figure, so replays / out-of-order syncs never
 * double-pay, and a lower figure (e.g. a feed correction) credits nothing.
 *
 * Fed by the AGG trade-event sync (POST /api/oracle/sync-volume) — the volume
 * number must come from a trusted source (webhook / server fills read), never
 * the client.
 */
export async function creditTradeVolume(
  aggUserId: string,
  cumulativeVolumeUsd: number,
  opts: { walletAddress?: string | null } = {}
): Promise<{ creditedPoints: number; tradeVolumeUsd: number; tradePoints: number; totalPoints: number }> {
  const player = await getOrCreatePlayer(aggUserId, opts);

  const incoming = Number.isFinite(cumulativeVolumeUsd) ? Math.max(0, cumulativeVolumeUsd) : 0;
  // Never regress the stored cumulative volume on a stale/lower report.
  const newVolume = Math.max(player.tradeVolumeUsd, incoming);

  const prevBase = tradeBasePoints(player.tradeVolumeUsd);
  const newBase = tradeBasePoints(newVolume);
  const deltaBase = newBase - prevBase;

  // Credit the delta at the player's CURRENT hold multiplier (snapshot, like
  // a settled match) and fold it into the leaderboard total.
  const credited = deltaBase > 0 ? applyBps(deltaBase, player.multiplierBps) : 0;

  const updated = await prisma.oraclePlayer.update({
    where: { id: player.id },
    data: {
      tradeVolumeUsd: newVolume,
      volumeSyncedAt: new Date(),
      ...(credited > 0
        ? {
            tradePoints: { increment: credited },
            totalPoints: { increment: credited },
            ledger: {
              create: {
                kind: 'trade',
                refId: 'volume',
                points: credited,
                note: `+${deltaBase} base × ${(player.multiplierBps / 10000).toFixed(2)}x hold · vol $${Math.round(newVolume)}`,
              },
            },
          }
        : {}),
    },
  });

  return {
    creditedPoints: credited,
    tradeVolumeUsd: updated.tradeVolumeUsd,
    tradePoints: updated.tradePoints,
    totalPoints: updated.totalPoints,
  };
}
