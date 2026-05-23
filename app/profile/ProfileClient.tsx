'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAggAuth, useLinkAccount } from '@agg-build/hooks';
import { useAggAuthFlow } from '@agg-build/auth';
import { useAggTrading, type AggPosition } from '@/app/hooks/useAggTrading';
import { formatUSD, formatVolume } from '@/app/lib/utils';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const SITE_URL = 'https://singl.market';

interface DisplayPosition extends AggPosition {
  eventSlug?: string;
  eventTitle?: string;
  currentPrice?: number;
}

function SharePositionButton({ pos, pnlPct, currentValue }: { pos: DisplayPosition; pnlPct: number; currentValue: number }) {
  const [showMenu, setShowMenu] = useState(false);

  const pnl = currentValue - pos.costBasis;
  const isWin = pnl >= 0;
  const entryPrice = Math.round(pos.avgPrice * 100);
  const livePrice = Math.round((pos.currentPrice ?? pos.avgPrice) * 100);

  const displaySide = pos.outcomeName || 'YES';
  const tweetText = `${isWin ? '📈' : '📉'} ${displaySide} on "${pos.marketTitle ?? ''}"\n\n${isWin ? '+' : ''}${pnlPct.toFixed(1)}% | ${entryPrice}¢ → ${livePrice}¢\n\nTrade on @singlmarket`;
  const shareUrl = pos.eventSlug ? `${SITE_URL}/event/${pos.eventSlug}` : SITE_URL;

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

function SharePortfolioButton({ totalValue, totalPnl, pnlPct, winRate, positionCount }: {
  totalValue: string; totalPnl: string; pnlPct: string; winRate: string; positionCount: number;
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

interface UserProfileData {
  id: string;
  aggUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  twitterHandle: string | null;
  twitterAvatar: string | null;
  referralCode: string;
  referredBy: string | null;
  referralCount?: number;
}

export default function ProfileClient() {
  const { isAuthenticated: authenticated, user } = useAggAuth();
  const { startMethod } = useAggAuthFlow();
  const linkAccount = useLinkAccount();
  const signIn = () => startMethod('siwe');
  const { ready, walletAddress, aggUserId, balance, initializing, error: sessionError, getQuote, placeOrder, getPositions, getBalance, redeem } = useAggTrading();
  const [positions, setPositions] = useState<DisplayPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const linkTwitter = useCallback(async () => {
    try {
      const res = await linkAccount.startLink({
        provider: 'twitter',
        redirectUrl: `${process.env.NEXT_PUBLIC_AGG_AUTH_REDIRECT}?intent=link`,
      });
      const url = (res as { url?: string; redirectUrl?: string }).url || (res as { redirectUrl?: string }).redirectUrl;
      if (url) window.location.assign(url);
    } catch (err) {
      console.error('[profile] Twitter link error:', err);
    }
  }, [linkAccount]);

  // Profile management
  const fetchProfile = useCallback(async () => {
    if (!aggUserId) return;
    try {
      const res = await fetch(`/api/profile?aggUserId=${encodeURIComponent(aggUserId)}`);
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
      } else {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const createRes = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aggUserId,
            walletAddress,
            displayName: (user as { username?: string | null } | undefined)?.username || null,
            twitterHandle: (user as { accounts?: Array<{ provider: string; providerAccountId: string }> } | undefined)?.accounts?.find(a => a.provider === 'twitter')?.providerAccountId || null,
            avatarUrl: (user as { avatarUrl?: string | null } | undefined)?.avatarUrl || null,
            referralCode: ref || undefined,
          }),
        });
        const createData = await createRes.json();
        if (createData.profile) setProfile(createData.profile);
      }
    } catch {}
  }, [aggUserId, walletAddress, user]);

  useEffect(() => {
    if (authenticated && aggUserId) fetchProfile();
  }, [authenticated, aggUserId, fetchProfile]);

  const saveProfile = async (updates: Record<string, string | null>) => {
    if (!aggUserId) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggUserId, walletAddress, ...updates }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setEditingProfile(false);
      }
    } catch {}
  };

  const refreshPositions = useCallback(async () => {
    if (!authenticated) {
      setLoading(false);
      return;
    }
    try {
      const list = await getPositions();
      setPositions(list as DisplayPosition[]);
    } catch (err) {
      console.error('[profile] positions error:', err);
    }
    setLoading(false);
  }, [authenticated, getPositions]);

  useEffect(() => {
    refreshPositions();
    const interval = setInterval(refreshPositions, 15000);
    return () => clearInterval(interval);
  }, [refreshPositions]);

  useEffect(() => {
    if (!authenticated) return;
    getBalance().catch(() => {});
    const interval = setInterval(() => { getBalance().catch(() => {}); }, 30000);
    return () => clearInterval(interval);
  }, [authenticated, getBalance]);

  const [sellError, setSellError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const handleRedeem = async (pos: DisplayPosition) => {
    if (!authenticated || !ready) {
      setSellError('Wallet not connected.');
      return;
    }
    setRedeeming(pos.id);
    setSellError(null);
    try {
      await redeem(pos.outcomeId);
      refreshPositions();
    } catch (err) {
      setSellError(err instanceof Error ? err.message : 'Redeem failed');
    }
    setRedeeming(null);
  };

  const handleSell = async (pos: DisplayPosition) => {
    if (!authenticated || !ready) {
      setSellError('Trading session not ready.');
      return;
    }
    setSelling(pos.id);
    setSellError(null);
    try {
      const quote = await getQuote({
        outcomeId: pos.outcomeId,
        side: 'SELL',
        sellShares: pos.shares,
      });
      if (!quote.quoteId) throw new Error('Could not get a sell quote for this position.');
      await placeOrder({
        quoteId: quote.quoteId,
        fallback: { outcomeId: pos.outcomeId, side: 'SELL', sellShares: pos.shares },
      });
      refreshPositions();
      setTimeout(() => { getBalance().catch(() => {}); }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sell failed';
      if (!msg.includes('rejected')) setSellError(msg);
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
        <Button variant="primary" size="lg" onClick={() => signIn()}>
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
    const lp = p.currentPrice ?? p.avgPrice;
    return sum + p.shares * lp;
  }, 0);
  const totalPotentialPayout = openPositions.reduce((sum, p) => sum + p.shares, 0);
  const totalUnrealizedPnl = totalCurrentValue - totalCost;
  const totalRealizedPnl = closedPositions.reduce((sum, p) => sum + ((p as DisplayPosition & { realizedPnl?: number }).realizedPnl || 0), 0);
  const totalBalance = totalCurrentValue + totalRealizedPnl;
  const winCount = closedPositions.filter(p => ((p as DisplayPosition & { realizedPnl?: number }).realizedPnl || 0) > 0).length;
  const winRate = closedPositions.length > 0 ? (winCount / closedPositions.length) * 100 : 0;

  const filteredOpen = filter
    ? openPositions.filter(p => (p.marketTitle || '').toLowerCase().includes(filter.toLowerCase()))
    : openPositions;

  return (
    <>
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-start gap-5">
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
                  onClick={linkTwitter}
                  className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--on-surface)] text-white rounded-md hover:opacity-90 transition-all cursor-pointer mb-2"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  Connect X
                </button>
              )}
              <div className="space-y-1">
                {(() => {
                  const email = (user as { accounts?: Array<{ provider: string; providerAccountId: string }> } | undefined)?.accounts?.find(a => a.provider === 'email')?.providerAccountId;
                  return email ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-widest">Email</span>
                      <span className="text-xs text-[var(--on-surface)]">{email}</span>
                    </div>
                  ) : null;
                })()}
                {walletAddress && <CopyableAddress label="Wallet" address={walletAddress} />}
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
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {balance && (
              <div className="bg-[var(--on-surface)] p-5 rounded-xl text-white relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-20 h-20 bg-[var(--primary-container)]/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Wallet Balance</span>
                    <span className="text-[8px] font-bold text-slate-500 bg-white/10 px-1.5 py-0.5 rounded">AGG</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total</div>
                      <span className="font-heading text-2xl font-bold">${balance.total.toFixed(2)}</span>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Available</div>
                      <span className="font-heading text-2xl font-bold">${balance.available.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              />
            </div>

            <div className="h-52 w-full flex items-end gap-[3px] relative">
              <div className="absolute left-0 right-0 bottom-[50%] border-b border-dashed border-[var(--surface-container-highest)]" />
              {(() => {
                const allBars = positions.map(p => {
                  const lp = p.currentPrice ?? p.avgPrice;
                  const cv = p.shares * lp;
                  const realized = (p as DisplayPosition & { realizedPnl?: number }).realizedPnl;
                  const pnlRatio = p.costBasis > 0 ? (cv - p.costBasis) / p.costBasis : (realized && p.costBasis > 0 ? realized / p.costBasis : 0);
                  return { id: p.id, ratio: pnlRatio, title: p.marketTitle ?? '', side: p.outcomeName ?? '', status: p.status };
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
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--on-surface)] text-white text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {bar.title} ({bar.side}) {bar.ratio >= 0 ? '+' : ''}{(bar.ratio * 100).toFixed(1)}%
                      </div>
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

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
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
              You can sell positions anytime before market expiration. After a market resolves, winning shares are automatically redeemable on the best venue via AGG.
            </div>

            {filteredOpen.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-[0.2em] text-left">
                      <th className="px-6 py-2">Market / Position</th>
                      <th className="px-6 py-2">Side</th>
                      <th className="px-6 py-2">Stake</th>
                      <th className="px-6 py-2">Current Value</th>
                      <th className="px-6 py-2">Pot. Payout</th>
                      <th className="px-6 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpen.map(pos => {
                      const lp = pos.currentPrice ?? pos.avgPrice;
                      const currentValue = pos.shares * lp;
                      const pnlPercent = pos.costBasis > 0 ? ((currentValue - pos.costBasis) / pos.costBasis) * 100 : 0;
                      const potPayout = pos.shares;

                      return (
                        <tr key={pos.id} className="bg-[var(--surface-container-lowest)] shadow-sm hover:shadow-md transition-shadow group">
                          <td className="px-6 py-5 rounded-l-xl">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 flex items-center justify-center rounded-md font-heading font-bold text-sm bg-[var(--surface-container-high)] text-[var(--on-surface)]">
                                {(pos.marketTitle || '??').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-heading font-bold text-sm text-[var(--on-surface)]">{pos.marketTitle}</p>
                                {pos.venue && (
                                  <p className="text-[10px] text-[var(--secondary)] font-medium capitalize">{pos.venue}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-xs font-bold text-[var(--on-surface)]">
                              {pos.outcomeName || 'YES'}
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
                              {pos.resolved ? (
                                pos.resolvedOutcome === pos.outcomeId ? (
                                  <button
                                    onClick={() => handleRedeem(pos)}
                                    disabled={redeeming === pos.id}
                                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--yes-bg)] text-[var(--yes)] rounded-full hover:bg-[var(--yes)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {redeeming === pos.id ? 'Redeeming...' : 'Redeem'}
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--no-bg)] text-[var(--no)] text-[10px] font-bold uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-xs">cancel</span>
                                    Loss
                                  </span>
                                )
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-[var(--primary-container)] rounded-full animate-pulse" />
                                    In Play
                                  </span>
                                  <button
                                    onClick={() => handleSell(pos)}
                                    disabled={selling === pos.id || !ready}
                                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--no-bg)] text-[var(--no)] rounded-full hover:bg-[var(--no)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {selling === pos.id ? 'Selling...' : 'Sell'}
                                  </button>
                                </>
                              )}
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

          {closedPositions.length > 0 && (
            <div className="col-span-12 mt-2">
              <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-[var(--secondary)] mb-4">
                Closed Positions ({closedPositions.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <tbody>
                    {closedPositions.map(pos => {
                      const realized = (pos as DisplayPosition & { realizedPnl?: number }).realizedPnl || 0;
                      return (
                        <tr key={pos.id} className="bg-[var(--surface-container-lowest)] opacity-70 hover:opacity-100 transition-opacity">
                          <td className="px-6 py-4 rounded-l-xl">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-container-high)] text-[var(--on-surface)]">
                                {pos.outcomeName || 'YES'}
                              </span>
                              <span className="font-heading font-bold text-sm">{pos.marketTitle}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm">{formatUSD(pos.costBasis)}</td>
                          <td className="px-6 py-4">
                            <span className={`font-mono font-bold text-sm ${realized >= 0 ? 'text-[var(--tertiary)]' : 'text-[var(--error)]'}`}>
                              {realized >= 0 ? '+' : ''}{formatUSD(realized)}
                            </span>
                          </td>
                          <td className="px-6 py-4 rounded-r-xl text-right">
                            <div className="flex items-center justify-end gap-2">
                              {realized > 0 && (() => {
                                const closedPnlPct = pos.costBasis > 0 ? (realized / pos.costBasis) * 100 : 0;
                                const closedValue = pos.costBasis + realized;
                                return <SharePositionButton pos={pos} pnlPct={closedPnlPct} currentValue={closedValue} />;
                              })()}
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                Closed
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
