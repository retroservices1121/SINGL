'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePrivy, useWallets, useLinkAccount } from '@privy-io/react-auth';
// import { usePolymarketSession } from '@/app/hooks/usePolymarketSession';
import { useSynthesisTrading } from '@/app/hooks/useSynthesisTrading';
import { formatUSD, formatPercent, formatVolume } from '@/app/lib/utils';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const SITE_URL = 'https://singl.market';

function SharePositionButton({ pos, pnlPct, currentValue }: { pos: Position; pnlPct: number; currentValue: number }) {
  const [showMenu, setShowMenu] = useState(false);

  const pnl = currentValue - pos.costBasis;
  const isWin = pnl >= 0;
  const entryPrice = Math.round(pos.avgPrice * 100);
  const livePrice = pos.side?.toLowerCase() === 'yes'
    ? Math.round((pos.currentYesPrice ?? pos.avgPrice) * 100)
    : Math.round((pos.currentNoPrice ?? pos.avgPrice) * 100);

  const ogUrl = `${SITE_URL}/api/og/position?` + new URLSearchParams({
    market: pos.marketTitle,
    event: pos.eventTitle,
    side: pos.side,
    entry: String(entryPrice),
    current: String(livePrice),
    pnl: `${isWin ? '+' : ''}${formatUSD(pnl)}`,
    pnlPct: `${isWin ? '+' : ''}${pnlPct.toFixed(1)}`,
    stake: formatUSD(pos.costBasis),
    payout: formatUSD(pos.shares),
  }).toString();

  const displaySide = sideLabel(pos);
  const tweetText = `${isWin ? '📈' : '📉'} ${displaySide} on "${pos.marketTitle}"\n\n${isWin ? '+' : ''}${pnlPct.toFixed(1)}% | ${entryPrice}¢ → ${livePrice}¢\n\nTrade on @singlmarket`;
  const shareUrl = `${SITE_URL}/event/${pos.eventSlug}`;

  const shareOnX = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
    setShowMenu(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${tweetText}\n${shareUrl}`);
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1.5 text-[var(--secondary)] hover:text-[var(--primary-container)] transition-colors cursor-pointer"
        title="Share position"
      >
        <span className="material-symbols-outlined text-sm">share</span>
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-8 z-50 bg-[var(--surface-container-lowest)] shadow-lg rounded-lg border border-[var(--surface-container-highest)] py-1 min-w-[140px]">
            <button onClick={shareOnX} className="flex items-center gap-2 w-full px-4 py-2 text-xs font-bold hover:bg-[var(--surface-container-high)] transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              Share on X
            </button>
            <button onClick={copyLink} className="flex items-center gap-2 w-full px-4 py-2 text-xs font-bold hover:bg-[var(--surface-container-high)] transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sm">content_copy</span>
              Copy text
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SharePortfolioButton({ totalValue, totalPnl, pnlPct, winRate, positionCount, volume, bars }: {
  totalValue: string; totalPnl: string; pnlPct: string; winRate: string; positionCount: number; volume: string; bars: number[];
}) {
  const isPositive = !totalPnl.startsWith('-');

  const tweetText = `My SINGL portfolio:\n\n${totalValue} | ${isPositive ? '+' : ''}${pnlPct}%\n${winRate}% win rate across ${positionCount} positions\n\nTrade on @singlmarket`;
  const shareUrl = SITE_URL;

  const shareOnX = () => {
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  return (
    <button
      onClick={shareOnX}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[var(--on-surface)] text-white rounded-md hover:opacity-90 transition-all cursor-pointer"
      title="Share portfolio on X"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
      Share
    </button>
  );
}

function CopyableAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">{label}</span>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
        title={`Click to copy: ${address}`}
      >
        <span className="font-mono text-xs text-[var(--on-surface)]">{truncated}</span>
        <span className="material-symbols-outlined text-xs text-[var(--secondary)]">
          {copied ? 'check' : 'content_copy'}
        </span>
      </button>
    </div>
  );
}

interface Position {
  id: string;
  marketTicker: string;
  marketTitle: string;
  eventSlug: string;
  eventTitle: string;
  side: string;
  shares: number;
  avgPrice: number;
  costBasis: number;
  status: string;
  orderId: string | null;
  tokenId: string | null;
  txSignature: string | null;
  closeTxSig: string | null;
  closePrice: number | null;
  realizedPnl: number | null;
  createdAt: string;
  negRisk?: boolean;
  tickSize?: string;
  currentYesPrice?: number | null;
  currentNoPrice?: number | null;
  outcomeName?: string | null;
  outcome2Name?: string | null;
}

function shortName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.replace(/\s+(Fighting Illini|Hawkeyes|Boilermakers|Wildcats|Huskies|Blue Devils|Volunteers|Wolverines|Panthers|Bulldogs|Bears|Tigers|Cyclones|Crimson Tide|Spartans|Golden Eagles|Red Raiders|Jayhawks|Cougars|Cavaliers|Badgers|Gators|Hoosiers|Buckeyes|Bruins|Trojans|Gaels|Musketeers|Commodores|Razorbacks|Cornhuskers|Aggies|Longhorns|Mountaineers|Terrapins|Sooners|Cowboys|Beavers|Ducks|Lumberjacks|Rebels|Seminoles|Cardinals|Redbirds|Catamounts|Demon Deacons|Tar Heels|Wolfpack|Yellow Jackets|Nittany Lions|Scarlet Knights|Hokies|Thundering Herd|Blazers|Peacocks|Bonnies|Owls|Shockers|Penguins|Zips|Rockets|Bearcats|Flyers|Explorers|Mavericks|Miners|Hilltoppers|Mean Green|Monarchs|Roadrunners|Mustangs|Ramblers|Billikens|Dukes|Spiders)$/i, '').trim();
}

function sideLabel(pos: Position): string {
  if (pos.side?.toLowerCase() === 'yes' && pos.outcomeName) {
    return shortName(pos.outcomeName) || pos.outcomeName;
  }
  if (pos.side?.toLowerCase() === 'no' && pos.outcome2Name) {
    return shortName(pos.outcome2Name) || pos.outcome2Name;
  }
  return pos.side?.toUpperCase() || 'YES';
}

function sideIsTeam(pos: Position): boolean {
  return !!(pos.side?.toLowerCase() === 'yes' ? pos.outcomeName : pos.outcome2Name);
}

interface UserProfileData {
  id: string;
  privyUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  twitterHandle: string | null;
  twitterAvatar: string | null;
  referralCode: string;
  referredBy: string | null;
  referralCount?: number;
}

export default function ProfileClient() {
  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { linkTwitter } = useLinkAccount({
    onSuccess: (params) => {
      // After linking Twitter, sync to our profile
      const linkedUser = params.user;
      if (linkedUser?.twitter) {
        saveProfile({
          twitterHandle: linkedUser.twitter.username || null,
          twitterId: linkedUser.twitter.subject || null,
          twitterAvatar: linkedUser.twitter.profilePictureUrl || null,
          displayName: profile?.displayName || linkedUser.twitter.name || null,
          avatarUrl: profile?.avatarUrl || linkedUser.twitter.profilePictureUrl || null,
        });
      }
    },
  });
  const { ready, walletAddress, initializing, error: sessionError, placeOrder } = useSynthesisTrading();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [usdceBalance, setUsdceBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);

  const eoaAddress = wallets[0]?.address || null;
  const walletAddr = walletAddress || eoaAddress;

  // Fetch USDC and USDC.e balances separately
  const balanceAddr = walletAddress || walletAddr;

  const fetchBalances = useCallback(async () => {
    if (!balanceAddr) return;

    const fetchTokenBalance = async (tokenAddr: string): Promise<number> => {
      try {
        const res = await fetch('https://polygon-bor-rpc.publicnode.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [
              {
                to: tokenAddr,
                data: `0x70a08231000000000000000000000000${balanceAddr.slice(2)}`,
              },
              'latest',
            ],
          }),
        });
        const data = await res.json();
        if (data.result && data.result !== '0x' && data.result !== '0x0') {
          return Number(BigInt(data.result)) / 1e6;
        }
      } catch { /* skip */ }
      return 0;
    };

    const [usdce, usdc] = await Promise.all([
      fetchTokenBalance('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'), // USDC.e (bridged)
      fetchTokenBalance('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'), // USDC (native)
    ]);
    setUsdceBalance(usdce.toFixed(2));
    setUsdcBalance(usdc.toFixed(2));
    setBalancesLoaded(true);
  }, [balanceAddr]);

  useEffect(() => {
    if (!balanceAddr) {
      setUsdcBalance(null);
      setUsdceBalance(null);
      setBalancesLoaded(false);
      return;
    }
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [balanceAddr, fetchBalances]);

  // Profile management
  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/profile?privyUserId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
      } else {
        // Auto-create profile on first visit
        // Check for referral code in URL
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const createRes = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privyUserId: user.id,
            walletAddress: walletAddr,
            displayName: (user as unknown as { twitter?: { name?: string } }).twitter?.name || null,
            twitterHandle: (user as unknown as { twitter?: { username?: string } }).twitter?.username || null,
            twitterId: (user as unknown as { twitter?: { subject?: string } }).twitter?.subject || null,
            twitterAvatar: (user as unknown as { twitter?: { profilePictureUrl?: string } }).twitter?.profilePictureUrl || null,
            avatarUrl: (user as unknown as { twitter?: { profilePictureUrl?: string } }).twitter?.profilePictureUrl || null,
            referralCode: ref || undefined,
          }),
        });
        const createData = await createRes.json();
        if (createData.profile) setProfile(createData.profile);
      }
    } catch {}
  }, [user?.id, walletAddr]);

  useEffect(() => {
    if (authenticated && user?.id) fetchProfile();
  }, [authenticated, user?.id, fetchProfile]);

  const saveProfile = async (updates: Record<string, string | null>) => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ privyUserId: user.id, walletAddress: walletAddr, ...updates }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setEditingProfile(false);
      }
    } catch {}
  };

  const fetchPositions = useCallback(async () => {
    if (!authenticated || !walletAddr) {
      setLoading(false);
      return;
    }

    // Fetch positions by both Synthesis and EOA addresses (trade may be stored under either)
    const addresses = new Set<string>();
    if (walletAddr) addresses.add(walletAddr);
    if (walletAddress) addresses.add(walletAddress);
    if (eoaAddress) addresses.add(eoaAddress);

    try {
      const allPositions: Position[] = [];
      const seenIds = new Set<string>();

      for (const addr of addresses) {
        const res = await fetch(`/api/positions?wallet=${addr}`);
        const data = await res.json();
        for (const pos of (data.positions || [])) {
          if (!seenIds.has(pos.id)) {
            seenIds.add(pos.id);
            allPositions.push(pos);
          }
        }
      }

      // Sort by newest first
      allPositions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPositions(allPositions);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [authenticated, walletAddr, walletAddress, eoaAddress]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 15000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const [sellError, setSellError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const handleRedeem = async (pos: Position) => {
    if (!authenticated || !walletAddress) {
      setSellError('Wallet not connected.');
      return;
    }

    setRedeeming(pos.id);
    setSellError(null);
    try {
      const res = await fetch('/api/polymarket/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditionId: pos.marketTicker,
          walletAddress: walletAddress,
          privyUserId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSellError(data.error || 'Redeem failed');
      } else {
        // Mark position as closed
        await fetch('/api/positions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionId: pos.id,
            closeTxSig: 'redeemed',
            closePrice: 1,
          }),
        });
        fetchPositions();
      }
    } catch (err) {
      setSellError(err instanceof Error ? err.message : 'Redeem failed');
    }
    setRedeeming(null);
  };

  const handleSell = async (pos: Position) => {
    if (!authenticated || !ready) {
      setSellError('Trading session not ready. Please wait for initialization.');
      return;
    }

    setSelling(pos.id);
    setSellError(null);

    try {
      // Resolve the correct CLOB token ID
      // pos.tokenId might be null for old positions — look it up from the API
      let sellTokenId = pos.tokenId;

      // Always resolve from API to get correct tokenId and check minOrderSize
      const resolveRes = await fetch(
        `/api/resolve-token?conditionId=${encodeURIComponent(pos.marketTicker)}&side=${pos.side?.toLowerCase() || 'yes'}`
      );
      if (resolveRes.ok) {
        const resolved = await resolveRes.json();
        if (resolved.tokenId) {
          sellTokenId = resolved.tokenId;

          // Check minimum order size
          const minSize = resolved.minOrderSize || 1;
          if (pos.shares < minSize) {
            setSellError(`Minimum sell size for this market is ${minSize} shares. You have ${pos.shares.toFixed(2)}.`);
            setSelling(null);
            return;
          }
        }
      }

      if (!sellTokenId || sellTokenId.startsWith('0x')) {
        setSellError('Could not resolve CLOB token ID for this position.');
        setSelling(null);
        return;
      }

      // Use current market price for position recording
      const sellPrice = pos.side === 'Yes'
        ? (pos.currentYesPrice ?? pos.avgPrice)
        : (pos.currentNoPrice ?? pos.avgPrice);

      // Query actual shares from Synthesis instead of trusting our DB
      let sellShares = Math.floor(pos.shares * 1000) / 1000;
      try {
        const privyUserId = user?.id;
        if (privyUserId) {
          const synthPosRes = await fetch(`/api/synthesis/positions?privy_user_id=${encodeURIComponent(privyUserId)}`);
          if (synthPosRes.ok) {
            const synthData = await synthPosRes.json();
            const synthPos = (synthData.positions || []).find(
              (p: { position?: { token_id?: string } }) => p.position?.token_id === sellTokenId
            );
            if (synthPos?.position?.shares) {
              sellShares = Math.floor(parseFloat(synthPos.position.shares) * 1000) / 1000;
            }
          }
        }
      } catch {
        // Fall back to DB shares
      }

      const result = await placeOrder({
        tokenId: sellTokenId,
        side: 'SELL',
        type: 'MARKET',
        amount: sellShares,
        units: 'SHARES',
      });

      await fetch('/api/positions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: pos.id,
          closeTxSig: result.order_id,
          closePrice: sellPrice,
        }),
      });

      fetchPositions();
      // Refresh balance after a short delay to allow on-chain settlement
      setTimeout(fetchBalances, 3000);
      setTimeout(fetchBalances, 10000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sell failed';
      if (!msg.includes('rejected')) {
        setSellError(msg);
      }
    }
    setSelling(null);
  };

  if (!authenticated) {
    return (
      <div className="text-center py-24">
        <div className="w-20 h-20 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-4xl text-[var(--secondary)]">account_balance_wallet</span>
        </div>
        <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-[var(--on-surface)] mb-2">
          Connect to View Portfolio
        </h2>
        <p className="text-[var(--secondary)] text-sm mb-6">Connect your wallet to view your positions and performance</p>
        <Button variant="primary" size="lg" onClick={login}>
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status !== 'open');

  const totalCost = openPositions.reduce((sum, p) => sum + p.costBasis, 0);
  const totalCurrentValue = openPositions.reduce((sum, p) => {
    const livePrice = p.side?.toLowerCase() === 'yes'
      ? (p.currentYesPrice ?? p.avgPrice)
      : (p.currentNoPrice ?? p.avgPrice);
    return sum + p.shares * livePrice;
  }, 0);
  const totalPotentialPayout = openPositions.reduce((sum, p) => sum + p.shares, 0);
  const totalUnrealizedPnl = totalCurrentValue - totalCost;
  const totalRealizedPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
  const totalBalance = totalCurrentValue + totalRealizedPnl;
  const winCount = closedPositions.filter(p => (p.realizedPnl || 0) > 0).length;
  const winRate = closedPositions.length > 0 ? (winCount / closedPositions.length) * 100 : 0;

  const filteredOpen = filter
    ? openPositions.filter(p => p.marketTitle.toLowerCase().includes(filter.toLowerCase()) || p.eventTitle.toLowerCase().includes(filter.toLowerCase()))
    : openPositions;

  return (
    <>
      {/* Header Summary */}
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative group">
              {profile?.avatarUrl || profile?.twitterAvatar ? (
                <img
                  src={profile.avatarUrl || profile.twitterAvatar || ''}
                  alt="avatar"
                  className="w-20 h-20 rounded-xl object-cover border-2 border-[var(--surface-container-highest)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-[var(--surface-container-high)] flex items-center justify-center border-2 border-[var(--surface-container-highest)]">
                  <span className="material-symbols-outlined text-3xl text-[var(--secondary)]">person</span>
                </div>
              )}
              <button
                onClick={() => { setEditName(profile?.displayName || ''); setEditAvatar(profile?.avatarUrl || ''); setEditingProfile(true); }}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--primary-container)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">edit</span>
              </button>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tighter text-[var(--on-surface)]">
                  {profile?.displayName || 'Portfolio Overview'}
                </h1>
                <button
                  onClick={() => { setEditName(profile?.displayName || ''); setEditAvatar(profile?.avatarUrl || ''); setEditingProfile(true); }}
                  className="text-[var(--secondary)] hover:text-[var(--primary-container)] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>
              {/* Twitter connection */}
              {profile?.twitterHandle ? (
                <a
                  href={`https://x.com/${profile.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[var(--secondary)] hover:text-[var(--primary-container)] transition-colors mb-2"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  @{profile.twitterHandle}
                </a>
              ) : (
                <button
                  onClick={() => linkTwitter()}
                  className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--on-surface)] text-white rounded-md hover:opacity-90 transition-all cursor-pointer mb-2"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  Connect X
                </button>
              )}
              {/* Wallet info */}
              <div className="space-y-1">
                {(() => {
                  const primaryWallet = eoaAddress || null;
                  const email = user?.email?.address;
                  return (
                    <>
                      {email && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Email</span>
                          <span className="text-xs text-[var(--on-surface)]">{email}</span>
                        </div>
                      )}
                      {primaryWallet && <CopyableAddress label="EOA" address={primaryWallet} />}
                      {walletAddress && <CopyableAddress label="Safe" address={walletAddress} />}
                      {!walletAddress && !initializing && authenticated && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Trading Wallet</span>
                          <span className="text-[10px] font-bold text-amber-600">Provisioning...</span>
                        </div>
                      )}
                      {!walletAddress && initializing && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Trading Wallet</span>
                          <span className="text-xs text-[var(--secondary)] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-container)] animate-pulse" />
                            Initializing...
                          </span>
                        </div>
                      )}
                      {sessionError && <div className="text-[10px] text-red-500">{sessionError}</div>}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {/* Token Balances */}
            {balanceAddr && balancesLoaded && (
              <div className="bg-[var(--on-surface)] p-5 rounded-xl text-white relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-20 h-20 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Wallet Balances</span>
                    <span className="text-[8px] font-bold text-slate-500 bg-white/10 px-1.5 py-0.5 rounded">Polygon</span>
                    {!walletAddress && (
                      <span className="text-[8px] font-bold text-amber-400 bg-white/10 px-1.5 py-0.5 rounded">EOA</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">USDC.e</div>
                      <span className="font-heading text-2xl font-bold">
                        {usdceBalance !== null ? `$${usdceBalance}` : '...'}
                      </span>
                      <div className="text-[8px] text-slate-600 mt-0.5">Bridged</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">USDC</div>
                      <span className="font-heading text-2xl font-bold">
                        {usdcBalance !== null ? `$${usdcBalance}` : '...'}
                      </span>
                      <div className="text-[8px] text-slate-600 mt-0.5">Native</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Position Value */}
            <div className="bg-[var(--surface-container-lowest)] p-5 rounded-xl shadow-ambient border-l-4 border-[var(--primary-container)]">
              <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-[0.2em] mb-1 block">Position Value</span>
              <span className="font-heading text-3xl font-bold text-[var(--on-surface)]">{formatUSD(totalBalance)}</span>
              {totalUnrealizedPnl !== 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`flex items-center font-bold text-sm ${totalUnrealizedPnl >= 0 ? 'text-[var(--primary)]' : 'text-[var(--error)]'}`}>
                    <span className="material-symbols-outlined text-sm mr-1">
                      {totalUnrealizedPnl >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {totalUnrealizedPnl >= 0 ? '+' : ''}{totalCost > 0 ? ((totalUnrealizedPnl / totalCost) * 100).toFixed(1) : '0'}%
                  </span>
                  <span className="text-[var(--secondary)] text-xs font-medium">unrealized</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setEditingProfile(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--surface-container-lowest)] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-[var(--on-surface)] mb-4">Edit Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter your display name"
                  maxLength={30}
                  className="w-full px-3 py-2 bg-[var(--surface-container-low)] border border-[var(--surface-container-highest)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-container)]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest block mb-1">Avatar URL</label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={e => setEditAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-[var(--surface-container-low)] border border-[var(--surface-container-highest)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-container)]"
                />
                {editAvatar && (
                  <img src={editAvatar} alt="preview" className="w-12 h-12 rounded-lg object-cover mt-2" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
              {!profile?.twitterHandle && (
                <button
                  onClick={() => { setEditingProfile(false); linkTwitter(); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 bg-[var(--on-surface)] text-white rounded-lg font-bold text-sm hover:opacity-90 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  Connect X to auto-fill avatar & name
                </button>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 px-4 py-2.5 bg-[var(--surface-container-high)] text-[var(--on-surface)] rounded-lg font-bold text-sm cursor-pointer hover:bg-[var(--surface-container-highest)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveProfile({ displayName: editName || null, avatarUrl: editAvatar || null })}
                  className="flex-1 px-4 py-2.5 bg-[var(--primary-container)] text-white rounded-lg font-bold text-sm cursor-pointer hover:opacity-90 transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Referral Program — hidden until fee model is live
      {profile && (
        <div className="mb-8 bg-[var(--surface-container-lowest)] rounded-xl p-6 shadow-ambient border border-[var(--primary-fixed)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[var(--primary-container)]">group_add</span>
                <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
                  Referral Program
                </h3>
              </div>
              <p className="text-xs text-[var(--secondary)]">
                Share your code and earn rewards when friends trade on SINGL.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="block text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest">Referrals</span>
                <span className="font-heading text-2xl font-bold text-[var(--on-surface)]">{profile.referralCount || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-[var(--surface-container-high)] px-4 py-2.5 rounded-lg">
                  <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest block">Your Code</span>
                  <span className="font-mono text-lg font-bold text-[var(--primary-container)]">{profile.referralCode}</span>
                </div>
                <button
                  onClick={async () => {
                    const link = `https://singl.market/profile?ref=${profile.referralCode}`;
                    await navigator.clipboard.writeText(link);
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2000);
                  }}
                  className="px-3 py-2.5 bg-[var(--primary-container)] text-white rounded-lg font-bold text-xs cursor-pointer hover:opacity-90 transition-all"
                >
                  {referralCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => {
                    const link = `https://singl.market/profile?ref=${profile.referralCode}`;
                    const text = `Trade prediction markets on SINGL — elections, sports, culture, macro. Use my referral link:`;
                    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                  }}
                  className="px-3 py-2.5 bg-[var(--on-surface)] text-white rounded-lg font-bold text-xs cursor-pointer hover:opacity-90 transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      */}

      {positions.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface-container-lowest)] rounded-xl shadow-ambient">
          <span className="material-symbols-outlined text-5xl text-[var(--surface-container-highest)] mb-4 block">monitoring</span>
          <h2 className="font-heading text-xl font-black uppercase tracking-tight text-[var(--on-surface)] mb-2">
            No positions yet
          </h2>
          <p className="text-sm text-[var(--secondary)]">Start trading to see your positions here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Performance Velocity */}
          <div className="col-span-12 lg:col-span-8 bg-[var(--surface-container-lowest)] p-8 rounded-xl relative overflow-hidden shadow-ambient">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-heading text-xl font-bold uppercase tracking-tight text-[var(--on-surface)]">Performance Velocity</h3>
                <p className="text-[var(--secondary)] text-xs">P&L per position — sorted by return</p>
              </div>
              <SharePortfolioButton
                totalValue={formatUSD(totalBalance)}
                totalPnl={`${totalUnrealizedPnl + totalRealizedPnl >= 0 ? '+' : ''}${formatUSD(totalUnrealizedPnl + totalRealizedPnl)}`}
                pnlPct={totalCost > 0 ? ((totalUnrealizedPnl + totalRealizedPnl) / totalCost * 100).toFixed(1) : '0'}
                winRate={winRate.toFixed(1)}
                positionCount={positions.length}
                volume={formatVolume(positions.reduce((s, p) => s + p.costBasis, 0))}
                bars={positions.map(p => {
                  const lp = p.side?.toLowerCase() === 'yes' ? (p.currentYesPrice ?? p.avgPrice) : (p.currentNoPrice ?? p.avgPrice);
                  return p.costBasis > 0 ? (p.shares * lp - p.costBasis) / p.costBasis : 0;
                })}
              />
            </div>

            {/* Velocity bar chart — all positions sorted by return % */}
            <div className="h-52 w-full flex items-end gap-[3px] relative">
              {/* Zero line */}
              <div className="absolute left-0 right-0 bottom-[50%] border-b border-dashed border-[var(--surface-container-highest)]" />
              {(() => {
                const allBars = positions.map(p => {
                  const lp = p.side?.toLowerCase() === 'yes' ? (p.currentYesPrice ?? p.avgPrice) : (p.currentNoPrice ?? p.avgPrice);
                  const cv = p.shares * lp;
                  const pnlRatio = p.costBasis > 0 ? (cv - p.costBasis) / p.costBasis : (p.realizedPnl && p.costBasis > 0 ? p.realizedPnl / p.costBasis : 0);
                  return { id: p.id, ratio: pnlRatio, title: p.marketTitle, side: p.side, status: p.status };
                }).sort((a, b) => b.ratio - a.ratio);

                if (allBars.length === 0) {
                  return <div className="w-full text-center text-[var(--secondary)] text-sm py-12">No positions to chart</div>;
                }

                const maxAbs = Math.max(0.01, ...allBars.map(b => Math.abs(b.ratio)));

                return allBars.slice(0, 20).map(bar => {
                  const normalizedHeight = (Math.abs(bar.ratio) / maxAbs) * 45;
                  const isUp = bar.ratio >= 0;
                  return (
                    <div key={bar.id} className="flex-1 flex flex-col items-center relative group" style={{ height: '100%' }}>
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--on-surface)] text-white text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {bar.title} ({bar.side}) {bar.ratio >= 0 ? '+' : ''}{(bar.ratio * 100).toFixed(1)}%
                      </div>
                      {/* Bar */}
                      <div className="w-full flex flex-col justify-end" style={{ height: '50%' }}>
                        {isUp && (
                          <div
                            className="w-full rounded-t bg-[var(--primary-container)] transition-all duration-300"
                            style={{ height: `${normalizedHeight}%`, minHeight: bar.ratio > 0 ? '4px' : '0', opacity: bar.status === 'closed' ? 0.4 : 0.9 }}
                          />
                        )}
                      </div>
                      <div className="w-full flex flex-col justify-start" style={{ height: '50%' }}>
                        {!isUp && (
                          <div
                            className="w-full rounded-b bg-[var(--error)] transition-all duration-300"
                            style={{ height: `${normalizedHeight}%`, minHeight: bar.ratio < 0 ? '4px' : '0', opacity: bar.status === 'closed' ? 0.4 : 0.9 }}
                          />
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-[var(--secondary)] font-bold uppercase tracking-widest">
              <span>Best</span>
              <span>Worst</span>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Active Stakes — dark card */}
            <div className="flex-1 bg-[var(--on-surface)] p-6 rounded-xl text-white relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-[var(--primary-container)]/20 rounded-full blur-3xl" />
              <h4 className="font-heading text-sm font-bold uppercase tracking-widest text-[var(--primary-container)] mb-6">
                Active Stakes
              </h4>
              <div className="space-y-6">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Total Committed</span>
                  <span className="text-2xl font-heading font-bold">{formatUSD(totalCost)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Win Rate</span>
                    <span className="text-lg font-heading font-bold">{winRate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Positions</span>
                    <span className="text-lg font-heading font-bold">{openPositions.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* P&L Summary */}
            <div className="flex-1 bg-[var(--surface-container-high)] p-6 rounded-xl">
              <h4 className="font-heading text-sm font-bold uppercase tracking-widest text-[var(--on-surface)] mb-4">
                P&L Summary
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--secondary)]">Unrealized</span>
                  <span className={`font-mono font-bold ${totalUnrealizedPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                    {totalUnrealizedPnl >= 0 ? '+' : ''}{formatUSD(totalUnrealizedPnl)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--secondary)]">Realized</span>
                  <span className={`font-mono font-bold ${totalRealizedPnl >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                    {totalRealizedPnl >= 0 ? '+' : ''}{formatUSD(totalRealizedPnl)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--surface-container-highest)]">
                  <span className="text-xs font-bold text-[var(--on-surface)]">Potential Payout</span>
                  <span className="font-mono font-bold text-lg text-[var(--on-surface)]">{formatUSD(totalPotentialPayout)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Open Positions Table */}
          <div className="col-span-12 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-2xl font-black uppercase tracking-tight text-[var(--on-surface)]">
                Active Predictions
              </h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  className="pl-10 pr-4 py-2 bg-[var(--surface-container-low)] border-none rounded-md text-xs font-medium focus:ring-1 focus:ring-[var(--primary-container)] outline-none"
                  placeholder="Filter markets..."
                  type="text"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
              </div>
            </div>

            {sellError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
                <span>{sellError}</span>
                <button onClick={() => setSellError(null)} className="text-red-400 hover:text-red-600 cursor-pointer ml-4">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}

            <div className="mb-4 px-4 py-3 bg-[var(--surface-container-low)] rounded-lg text-xs text-[var(--secondary)]">
              <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
              You can sell positions anytime before market expiration. After a market resolves, winning shares are automatically redeemable for USDC on Polymarket.
            </div>

            {filteredOpen.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-[0.2em] text-left">
                      <th className="px-6 py-2">Event / Position</th>
                      <th className="px-6 py-2">Side</th>
                      <th className="px-6 py-2">Stake</th>
                      <th className="px-6 py-2">Current Value</th>
                      <th className="px-6 py-2">Pot. Payout</th>
                      <th className="px-6 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpen.map(pos => {
                      const livePrice = pos.side?.toLowerCase() === 'yes'
                        ? (pos.currentYesPrice ?? pos.avgPrice)
                        : (pos.currentNoPrice ?? pos.avgPrice);
                      const currentValue = pos.shares * livePrice;
                      const pnlPercent = pos.costBasis > 0 ? ((currentValue - pos.costBasis) / pos.costBasis) * 100 : 0;
                      const potPayout = pos.shares;

                      return (
                        <tr key={pos.id} className="bg-[var(--surface-container-lowest)] shadow-sm hover:shadow-md transition-shadow group">
                          <td className="px-6 py-5 rounded-l-xl">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 flex items-center justify-center rounded-md font-heading font-bold text-sm ${
                                pos.side === 'yes'
                                  ? 'bg-[var(--yes-bg)] text-[var(--yes)]'
                                  : 'bg-[var(--no-bg)] text-[var(--no)]'
                              }`}>
                                {pos.eventTitle.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-heading font-bold text-sm text-[var(--on-surface)]">{pos.marketTitle}</p>
                                <p className="text-[10px] text-[var(--secondary)] font-medium">{pos.eventTitle}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`text-xs font-bold ${sideIsTeam(pos) ? '' : 'uppercase'} ${pos.side === 'yes' ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
                              {sideLabel(pos)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-medium text-[var(--on-surface)] font-mono">{formatUSD(pos.costBasis)}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--on-surface)] font-mono">{formatUSD(currentValue)}</span>
                              <span className={`text-[10px] font-bold ${pnlPercent >= 0 ? 'text-[var(--primary)]' : 'text-[var(--secondary)]'}`}>
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-sm font-bold text-[var(--on-surface)] font-mono">{formatUSD(potPayout)}</span>
                          </td>
                          <td className="px-6 py-5 rounded-r-xl text-right">
                            <div className="flex items-center justify-end gap-2">
                              <SharePositionButton pos={pos} pnlPct={pnlPercent} currentValue={currentValue} />
                              {(() => {
                                const yesP = pos.currentYesPrice ?? null;
                                const noP = pos.currentNoPrice ?? null;
                                const resolved = yesP !== null && noP !== null && (yesP >= 0.99 || noP >= 0.99 || yesP <= 0.01 || noP <= 0.01);
                                const won = resolved && (
                                  (pos.side?.toLowerCase() === 'yes' && (yesP ?? 0) >= 0.99) ||
                                  (pos.side?.toLowerCase() === 'no' && (noP ?? 0) >= 0.99)
                                );

                                if (resolved && won) {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--yes-bg)] text-[var(--yes)] text-[10px] font-bold uppercase tracking-wider">
                                      <span className="material-symbols-outlined text-xs">check_circle</span>
                                      Won
                                    </span>
                                  );
                                }
                                if (resolved && !won) {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--no-bg)] text-[var(--no)] text-[10px] font-bold uppercase tracking-wider">
                                      <span className="material-symbols-outlined text-xs">cancel</span>
                                      Loss
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-[var(--primary-container)] rounded-full animate-pulse" />
                                    In Play
                                  </span>
                                );
                              })()}
                              {(() => {
                                const yesP = pos.currentYesPrice ?? null;
                                const noP = pos.currentNoPrice ?? null;
                                const resolved = yesP !== null && noP !== null && (yesP >= 0.99 || noP >= 0.99 || yesP <= 0.01 || noP <= 0.01);
                                const won = resolved && (
                                  (pos.side?.toLowerCase() === 'yes' && (yesP ?? 0) >= 0.99) ||
                                  (pos.side?.toLowerCase() === 'no' && (noP ?? 0) >= 0.99)
                                );

                                if (resolved && won) {
                                  return (
                                    <button
                                      onClick={() => handleRedeem(pos)}
                                      disabled={redeeming === pos.id}
                                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--yes-bg)] text-[var(--yes)] rounded-full hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {redeeming === pos.id ? 'Redeeming...' : 'Redeem'}
                                    </button>
                                  );
                                }
                                if (!resolved) {
                                  return (
                                    <button
                                      onClick={() => handleSell(pos)}
                                      disabled={selling === pos.id || !ready}
                                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--no-bg)] text-[var(--no)] rounded-full hover:bg-[var(--no)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {selling === pos.id ? 'Selling...' : 'Sell'}
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-[var(--secondary)] text-sm bg-[var(--surface-container-lowest)] rounded-xl">
                {filter ? 'No positions match your filter.' : 'No active positions.'}
              </div>
            )}
          </div>

          {/* Closed Positions */}
          {closedPositions.length > 0 && (
            <div className="col-span-12 mt-2">
              <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-[var(--secondary)] mb-4">
                Closed Positions ({closedPositions.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <tbody>
                    {closedPositions.map(pos => (
                      <tr key={pos.id} className="bg-[var(--surface-container-lowest)] opacity-70 hover:opacity-100 transition-opacity">
                        <td className="px-6 py-4 rounded-l-xl">
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              pos.side === 'yes' ? 'bg-[var(--yes-bg)] text-[var(--yes)]' : 'bg-[var(--no-bg)] text-[var(--no)]'
                            }`}>
                              {sideLabel(pos)}
                            </span>
                            <span className="font-heading font-bold text-sm">{pos.marketTitle}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm">{formatUSD(pos.costBasis)}</td>
                        <td className="px-6 py-4">
                          <span className={`font-mono font-bold text-sm ${(pos.realizedPnl || 0) >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                            {(pos.realizedPnl || 0) >= 0 ? '+' : ''}{formatUSD(pos.realizedPnl || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 rounded-r-xl text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(pos.realizedPnl || 0) > 0 && (() => {
                              const closedPnlPct = pos.costBasis > 0 ? ((pos.realizedPnl || 0) / pos.costBasis) * 100 : 0;
                              const closedValue = pos.costBasis + (pos.realizedPnl || 0);
                              return <SharePositionButton pos={pos} pnlPct={closedPnlPct} currentValue={closedValue} />;
                            })()}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                              Closed
                            </span>
                            {!pos.closeTxSig?.includes('redeemed') && (
                              <button
                                onClick={() => handleRedeem(pos)}
                                disabled={redeeming === pos.id}
                                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--yes-bg)] text-[var(--yes)] rounded-full hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {redeeming === pos.id ? 'Redeeming...' : 'Redeem'}
                              </button>
                            )}
                            {pos.closeTxSig?.includes('redeemed') && (
                              <span className="text-[10px] font-bold text-[var(--yes)] uppercase tracking-wider">Redeemed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
