import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// DFlow Proof API — check wallet verification status
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet address required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://proof.dflow.net/verify/${wallet}`);
    if (!res.ok) {
      return NextResponse.json({ verified: false });
    }
    const data = await res.json();
    return NextResponse.json({ verified: data.verified === true });
  } catch {
    return NextResponse.json({ verified: false });
  }
}
