'use client';

import { useEffect, useState } from 'react';
import type { ParsedMarket } from '@/app/lib/ncaa';
import { useTradeStore } from '@/app/store/tradeStore';

interface UpsetAlert {
  team: string;
  currentOdds: number;
  change: number;
  market: ParsedMarket;
  severity: 'mild' | 'moderate' | 'major';
}

interface UpsetAlertBannerProps {
  markets: ParsedMarket[];
  previousPrices?: Map<string, number>;
}

function detectUpsets(markets: ParsedMarket[], previousPrices?: Map<string, number>): UpsetAlert[] {
  const alerts: UpsetAlert[] = [];

  for (const m of markets) {
    if (!m.teamName) continue;

    let changePoints: number | null = null;

    // Method 1: Use change24h from market data
    if (m.change24h !== null && m.change24h !== undefined) {
      changePoints = m.change24h;
    }
    // Method 2: Use previousPrices map
    else if (previousPrices && previousPrices.size > 0) {
      const prevPrice = previousPrices.get(m.conditionId);
      if (prevPrice !== undefined) {
        changePoints = (m.yesPrice - prevPrice) * 100;
      }
    }

    if (changePoints === null) continue;

    // Alert on significant positive movements (underdogs surging) OR big drops (favorites fading)
    const isUpset = changePoints >= 5 && m.yesPrice < 0.40; // Underdog rising
    const isFavoriteFade = changePoints <= -8 && m.yesPrice > 0.15; // Favorite dropping

    if (isUpset || isFavoriteFade) {
      let severity: 'mild' | 'moderate' | 'major' = 'mild';
      const absChange = Math.abs(changePoints);
      if (absChange >= 15) severity = 'major';
      else if (absChange >= 8) severity = 'moderate';

      alerts.push({
        team: m.teamName,
        currentOdds: m.yesPrice,
        change: changePoints,
        market: m,
        severity,
      });
    }
  }

  return alerts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

function GameCountdown({ closeTime }: { closeTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isSoon, setIsSoon] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(closeTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('LIVE');
        setIsSoon(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 1) {
        setTimeLeft(`${mins}m`);
        setIsSoon(true);
      } else if (hours < 24) {
        setTimeLeft(`${hours}h ${mins}m`);
        setIsSoon(hours < 3);
      } else {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
        setIsSoon(false);
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [closeTime]);

  if (!timeLeft) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
      isSoon
        ? 'bg-[var(--primary-container)] text-white animate-pulse'
        : 'bg-[var(--surface-container-high)] text-[var(--secondary)]'
    }`}>
      {isSoon && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
      {timeLeft === 'LIVE' ? 'TIPPING OFF' : timeLeft}
    </span>
  );
}

export default function UpsetAlertBanner({ markets, previousPrices }: UpsetAlertBannerProps) {
  const openTrade = useTradeStore(s => s.openTrade);
  const alerts = detectUpsets(markets, previousPrices);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[var(--primary-container)]" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}>
          notifications_active
        </span>
        <h3 className="text-sm font-black font-heading uppercase tracking-widest text-[var(--on-surface)]">
          Upset Alerts
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-[var(--primary-fixed)] text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest">
          {alerts.length} active
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {alerts.map(alert => {
          const isRising = alert.change > 0;
          return (
            <div
              key={alert.market.conditionId}
              className={`shrink-0 w-60 p-4 rounded-xl transition-all cursor-pointer hover:scale-[1.02] ${
                alert.severity === 'major'
                  ? 'bg-[var(--on-surface)] text-white'
                  : alert.severity === 'moderate'
                    ? 'bg-[var(--primary-fixed)] border border-[var(--primary-container)]'
                    : 'bg-[var(--surface-container-low)]'
              }`}
              onClick={() => openTrade(alert.market, 'yes')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-heading font-black text-sm uppercase ${
                  alert.severity === 'major' ? 'text-white' : 'text-[var(--on-surface)]'
                }`}>
                  {alert.team}
                </span>
                <div className="flex items-center gap-1.5">
                  {alert.market.closeTime && <GameCountdown closeTime={alert.market.closeTime} />}
                  {alert.severity === 'major' && (
                    <span className="w-2 h-2 rounded-full bg-[var(--primary-container)] animate-pulse" />
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className={`font-mono text-2xl font-bold ${
                  alert.severity === 'major' ? 'text-[var(--primary-container)]' : 'text-[var(--on-surface)]'
                }`}>
                  {Math.round(alert.currentOdds * 100)}%
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-bold ${isRising ? 'text-[var(--yes)]' : 'text-[var(--no)]'}`}>
                  <span className="material-symbols-outlined text-xs">
                    {isRising ? 'trending_up' : 'trending_down'}
                  </span>
                  {isRising ? '+' : ''}{alert.change.toFixed(0)}pts
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${alert.severity === 'major' ? 'text-slate-400' : 'text-[var(--secondary)]'}`}>
                  {isRising ? 'Underdog surging' : 'Favorite fading'}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${
                  alert.severity === 'major' ? 'text-[var(--primary-container)]' : 'text-[var(--primary)]'
                }`}>
                  Trade
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
