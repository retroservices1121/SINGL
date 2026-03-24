import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const BUILDER_API_KEY = process.env.POLY_BUILDER_API_KEY || '';
const BUILDER_SECRET = process.env.POLY_BUILDER_SECRET || '';
const BUILDER_PASSPHRASE = process.env.POLY_BUILDER_PASSPHRASE || '';

function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  path: string,
  body: string,
): string {
  const message = timestamp + method.toUpperCase() + path + body;
  const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'base64'));
  hmac.update(message);
  return hmac.digest('base64');
}

export async function POST(req: NextRequest) {
  const { method, path, body } = await req.json();

  if (!BUILDER_API_KEY || !BUILDER_SECRET || !BUILDER_PASSPHRASE) {
    return NextResponse.json(
      { error: 'Builder credentials not configured' },
      { status: 500 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildHmacSignature(
    BUILDER_SECRET,
    timestamp,
    method || 'GET',
    path || '',
    body || '',
  );

  return NextResponse.json({
    POLY_BUILDER_API_KEY: BUILDER_API_KEY,
    POLY_BUILDER_TIMESTAMP: timestamp,
    POLY_BUILDER_PASSPHRASE: BUILDER_PASSPHRASE,
    POLY_BUILDER_SIGNATURE: signature,
  });
}
