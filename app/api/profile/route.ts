import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// GET: fetch profile by privy user ID or wallet address
export async function GET(req: NextRequest) {
  const privyUserId = req.nextUrl.searchParams.get('privyUserId');
  const wallet = req.nextUrl.searchParams.get('wallet');

  if (!privyUserId && !wallet) {
    return NextResponse.json({ error: 'privyUserId or wallet required' }, { status: 400 });
  }

  const profile = await prisma.userProfile.findFirst({
    where: privyUserId ? { privyUserId } : { walletAddress: wallet! },
  });

  if (!profile) {
    return NextResponse.json({ profile: null });
  }

  // Count referrals
  const referralCount = await prisma.userProfile.count({
    where: { referredBy: profile.referralCode },
  });

  return NextResponse.json({ profile: { ...profile, referralCount } });
}

// POST: create or update profile
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { privyUserId, walletAddress, displayName, avatarUrl, twitterHandle, twitterId, twitterAvatar, referralCode: usedReferralCode } = body;

  if (!privyUserId) {
    return NextResponse.json({ error: 'privyUserId required' }, { status: 400 });
  }

  // Check if profile exists
  const existing = await prisma.userProfile.findUnique({
    where: { privyUserId },
  });

  if (existing) {
    // Update existing profile
    const profile = await prisma.userProfile.update({
      where: { privyUserId },
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

  // Validate referral code if provided
  if (usedReferralCode) {
    const referrer = await prisma.userProfile.findUnique({
      where: { referralCode: usedReferralCode },
    });
    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }
  }

  // Create new profile with unique referral code
  let code = generateReferralCode();
  // Ensure uniqueness (very unlikely collision with 8 hex chars but be safe)
  for (let i = 0; i < 5; i++) {
    const dup = await prisma.userProfile.findUnique({ where: { referralCode: code } });
    if (!dup) break;
    code = generateReferralCode();
  }

  const profile = await prisma.userProfile.create({
    data: {
      privyUserId,
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
