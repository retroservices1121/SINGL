import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { ClobClient } from '@polymarket/clob-client';

export const dynamic = 'force-dynamic';

const CLOB_URL = 'https://clob.polymarket.com';

/**
 * Server-side proxy for Polymarket CLOB order placement.
 * Uses the actual ClobClient SDK to ensure HMAC signing matches exactly.
 *
 * The client creates and signs the order locally (EIP-712), then sends
 * the signed order + API credentials here. We use ClobClient.postOrder()
 * which handles L2 HMAC auth internally.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, method, data, apiKey, apiSecret, passphrase, address, safeAddress, orderType } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }

    // For order posting, use the ClobClient SDK directly
    if (endpoint === '/order' && apiKey && apiSecret && passphrase) {
      try {
        // Create a minimal signer that just returns the address
        // (we don't need to sign anything server-side, the order is already signed)
        const wallet = new ethers.Wallet(
          // Use a dummy private key — we only need the wallet for address resolution
          // The actual signing already happened client-side
          '0x0000000000000000000000000000000000000000000000000000000000000001'
        );

        // Override getAddress to return the actual user address
        const fakeWallet = {
          ...wallet,
          getAddress: async () => address,
          address: address,
        };

        const clobClient = new ClobClient(
          CLOB_URL,
          137,
          fakeWallet as unknown as ethers.Wallet,
          {
            key: apiKey,
            secret: apiSecret,
            passphrase: passphrase,
          },
          2, // POLY_GNOSIS_SAFE
          safeAddress || address,
        );

        // The data contains the already-signed order payload
        // Use the internal post method with proper L2 headers
        const orderData = data;

        console.log('[clob proxy] Posting order via ClobClient SDK');
        console.log('[clob proxy] Order payload keys:', Object.keys(orderData || {}));

        // Post order — ClobClient handles L2 HMAC headers
        // FOK = Fill or Kill (immediate), GTC = Good Till Cancelled (limit)
        const response = await clobClient.postOrder(orderData, orderType || undefined, false);

        console.log('[clob proxy] Order response:', JSON.stringify(response));

        // Check if FOK order was actually filled
        if (orderType === 'FOK' && response && !response.orderID && !response.orderIds?.length) {
          console.error('[clob proxy] FOK order likely not filled:', response);
          return NextResponse.json({ error: 'Order not filled — no matching orders at this price', details: response }, { status: 422 });
        }

        return NextResponse.json(response);
      } catch (sdkErr) {
        const sdkMsg = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
        console.error('[clob proxy] SDK postOrder error:', sdkMsg);

        // If SDK approach fails, fall back to manual headers
        console.log('[clob proxy] Falling back to manual HMAC...');
      }
    }

    // Fallback: manual request with HMAC headers
    const url = `${CLOB_URL}${endpoint}`;
    const httpMethod = (method || 'POST').toUpperCase();
    const bodyStr = data ? JSON.stringify(data) : '';

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey && apiSecret && passphrase && address) {
      const crypto = await import('crypto');
      const timestamp = Math.floor(Date.now() / 1000);
      let message = `${timestamp}${httpMethod}${endpoint}`;
      if (bodyStr) message += bodyStr;

      const base64Secret = Buffer.from(apiSecret, 'base64');
      const hmac = crypto.createHmac('sha256', base64Secret);
      const sig = hmac.update(message).digest('base64');
      const sigUrlSafe = sig.replace(/\+/g, '-').replace(/\//g, '_');

      fetchHeaders['POLY_ADDRESS'] = address;
      fetchHeaders['POLY_SIGNATURE'] = sigUrlSafe;
      fetchHeaders['POLY_TIMESTAMP'] = `${timestamp}`;
      fetchHeaders['POLY_API_KEY'] = apiKey;
      fetchHeaders['POLY_PASSPHRASE'] = passphrase;
    }

    console.log(`[clob proxy] ${httpMethod} ${endpoint} (body: ${bodyStr.length} bytes)`);

    const res = await fetch(url, {
      method: httpMethod,
      headers: fetchHeaders,
      body: bodyStr || undefined,
    });

    const responseText = await res.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!res.ok) {
      console.error('[clob proxy] Error:', res.status, responseData);
      return NextResponse.json(
        { error: responseData.error || responseData.raw || `CLOB API returned ${res.status}`, data: responseData },
        { status: res.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (err) {
    console.error('[clob proxy] Error:', err);
    const msg = err instanceof Error ? err.message : 'Proxy error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
