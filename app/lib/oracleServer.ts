// ── SPREDD Oracle — server-side DB helpers ───────────────────────────────────
import { prisma } from './db';

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
