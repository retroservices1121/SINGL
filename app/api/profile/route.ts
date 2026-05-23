import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET: fetch profile by AGG user ID or wallet address
export async function GET(req: NextRequest) {
  const aggUserId = req.nextUrl.searchParams.get('aggUserId');
  const wallet = req.nextUrl.searchParams.get('wallet');

  if (!aggUserId && !wallet) {
    return NextResponse.json({ error: 'aggUserId or wallet required' }, { status: 400 });
  }

  const profile = await prisma.userProfile.findFirst({
    where: aggUserId ? { aggUserId } : { walletAddress: wallet! },
  });

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  const referralCount = await prisma.userProfile.count({
    where: { referredBy: profile.referralCode },
  });

  return NextResponse.json({ profile: { ...profile, referralCount } });
}

// POST: create or update profile
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { aggUserId, walletAddress, displayName, avatarUrl, twitterHandle, twitterId, twitterAvatar, referralCode: usedReferralCode } = body;

  if (!aggUserId) {
    return NextResponse.json({ error: 'aggUserId required' }, { status: 400 });
  }

  const existing = await prisma.userProfile.findUnique({
    where: { aggUserId },
  });

  if (existing) {
    const profile = await prisma.userProfile.update({
      where: { aggUserId },
      data: {
        ...(walletAddress !== undefined && { walletAddress }),
        ...(displayName !== undefined && { displayName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(twitterHandle !== undefined && { twitterHandle }),
        ...(twitterId !== undefined && { twitterId }),
        ...(twitterAvatar !== undefined && { twitterAvatar }),
      },
    });
    return NextResponse.json({ profile });
  }

  if (usedReferralCode) {
    const referrer = await prisma.userProfile.findUnique({
      where: { referralCode: usedReferralCode },
    });
    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }
  }

  let code = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const dup = await prisma.userProfile.findUnique({ where: { referralCode: code } });
    if (!dup) break;
    code = generateReferralCode();
  }

  const profile = await prisma.userProfile.create({
    data: {
      aggUserId,
      walletAddress: walletAddress || null,
      displayName: displayName || null,
      avatarUrl: avatarUrl || null,
      twitterHandle: twitterHandle || null,
      twitterId: twitterId || null,
      twitterAvatar: twitterAvatar || null,
      referralCode: code,
      referredBy: usedReferralCode || null,
    },
  });

  return NextResponse.json({ profile });
}
