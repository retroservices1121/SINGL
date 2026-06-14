import MarketClient from './MarketClient';

export default async function MarketDetailPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <MarketClient address={address as `0x${string}`} />;
}
