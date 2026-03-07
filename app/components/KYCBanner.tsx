'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Button from './ui/Button';

export default function KYCBanner() {
  const { publicKey, connected } = useWallet();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) return;

    fetch(`/api/kyc?wallet=${publicKey.toBase58()}`)
      .then(r => r.json())
      .then(data => setVerified(data.verified))
      .catch(() => setVerified(false));
  }, [connected, publicKey]);

  if (!connected || !publicKey || verified === null || verified) return null;

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kyc/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
      });
      const data = await res.json();
      if (data.verificationUrl) {
        window.open(data.verificationUrl, '_blank');
      }
    } catch (err) {
      console.error('KYC initiation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--orange-lt)] border border-[var(--orange)] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">Identity verification required</p>
        <p className="text-xs text-[var(--text-sec)]">Verify your identity to start trading on SINGLS</p>
      </div>
      <Button variant="primary" size="sm" onClick={handleVerify} disabled={loading}>
        {loading ? 'Loading...' : 'Verify Now'}
      </Button>
    </div>
  );
}
