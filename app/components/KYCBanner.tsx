'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Button from './ui/Button';

export default function KYCBanner() {
  const { publicKey, connected, signMessage } = useWallet();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!connected || !publicKey) return;

    fetch(`/api/kyc?wallet=${publicKey.toBase58()}`)
      .then(r => r.json())
      .then(data => setVerified(data.verified))
      .catch(() => setVerified(false));
  }, [connected, publicKey]);

  const handleVerify = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('Wallet does not support message signing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate timestamp and sign the Proof KYC message
      const timestamp = Date.now().toString();
      const message = `Proof KYC verification: ${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);

      // Convert signature to base58
      const signature = encodeBase58(signatureBytes);

      // Build the redirect URI back to our site
      const redirectUri = encodeURIComponent(window.location.origin);

      // Open DFlow Proof verification page
      const proofUrl = `https://dflow.net/proof?wallet=${publicKey.toBase58()}&signature=${signature}&timestamp=${timestamp}&redirect_uri=${redirectUri}`;
      window.open(proofUrl, '_blank');
    } catch (err) {
      if (err instanceof Error && err.message.includes('rejected')) {
        setError('Signature request was rejected');
      } else {
        setError('Failed to initiate verification');
      }
      console.error('KYC initiation failed:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, signMessage]);

  if (!connected || !publicKey || verified === null || verified) return null;

  return (
    <div className="bg-[var(--orange-lt)] border border-[var(--orange)] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">Identity verification required</p>
        <p className="text-xs text-[var(--text-sec)]">Verify your identity via DFlow Proof to start trading</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <Button variant="primary" size="sm" onClick={handleVerify} disabled={loading}>
        {loading ? 'Signing...' : 'Verify Now'}
      </Button>
    </div>
  );
}

// Base58 encoder for Solana signatures
function encodeBase58(bytes: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) str += ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) str += ALPHABET[digits[i]];
  return str;
}
