import { NextRequest, NextResponse } from 'next/server';
import { checkKYCStatus, initiateKYC } from '@/app/lib/dflow';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  try {
    const status = await checkKYCStatus(wallet);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ verified: false });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { walletAddress } = body;
  if (!walletAddress) {
    return NextResponse.json({ error: 'walletAddress required' }, { status: 400 });
  }

  try {
    const verificationUrl = await initiateKYC(walletAddress);
    return NextResponse.json({ verificationUrl });
  } catch {
    return NextResponse.json({ error: 'Failed to initiate KYC' }, { status: 500 });
  }
}
