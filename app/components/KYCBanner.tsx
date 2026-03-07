'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import Button from './ui/Button';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function KYCBannerInner() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated || !wallet) return;

    fetch(`/api/kyc?wallet=${wallet.address}`)
      .then(r => r.json())
      .then(data => setVerified(data.verified))
      .catch(() => setVerified(false));
  }, [authenticated, wallet]);

  if (!authenticated || !wallet || verified === null || verified) return null;

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kyc/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.address }),
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

export default function KYCBanner() {
  if (!PRIVY_APP_ID) return null;
  return <KYCBannerInner />;
}
