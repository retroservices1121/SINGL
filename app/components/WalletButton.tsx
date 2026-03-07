'use client';

import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function WalletButton() {
  return <WalletMultiButton style={{ height: '36px', fontSize: '13px', borderRadius: '8px' }} />;
}
