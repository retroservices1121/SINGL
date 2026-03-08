'use client';

import type { XPostData, MarketData } from '@/app/types';

interface LivePulseProps {
  posts: XPostData[];
  markets: MarketData[];
}

// Simple keyword-based sentiment
const BULLISH_WORDS = ['win', 'winning', 'surge', 'bullish', 'rally', 'soar', 'up', 'rise', 'gain', 'strong', 'confident', 'yes', 'likely', 'expect', 'predicted', 'favorite', 'lead', 'ahead', 'landslide', 'lock'];
const BEARISH_WORDS = ['lose', 'losing', 'crash', 'bearish', 'drop', 'fall', 'down', 'sink', 'weak', 'unlikely', 'no', 'doubt', 'fail', 'risk', 'concern', 'behind', 'collapse', 'upset', 'underdog'];

function analyzeSentiment(posts: XPostData[]): { score: number; bullish: number; bearish: number; neutral: number } {
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  for (const post of posts) {
    const text = post.text.toLowerCase();
    const bullCount = BULLISH_WORDS.filter(w => text.includes(w)).length;
    const bearCount = BEARISH_WORDS.filter(w => text.includes(w)).length;

    if (bullCount > bearCount) bullish++;
    else if (bearCount > bullCount) bearish++;
    else neutral++;
  }

  const total = posts.length || 1;
  // Score from -1 (bearish) to +1 (bullish)
  const score = (bullish - bearish) / total;

  return { score, bullish, bearish, neutral };
}

export default function LivePulse({ posts, markets }: LivePulseProps) {
  if (posts.length === 0 && markets.length === 0) return null;

  const { score, bullish, bearish, neutral } = analyzeSentiment(posts);

  // Market implied probability (average yes price)
  const avgYes = markets.length > 0
    ? markets.reduce((sum, m) => sum + m.yesPrice, 0) / markets.length
    : 0.5;

  // Combine social sentiment with market signal
  const marketSignal = (avgYes - 0.5) * 2; // -1 to +1
  const combined = posts.length > 0 ? (score * 0.4 + marketSignal * 0.6) : marketSignal;
  const normalizedScore = Math.max(-1, Math.min(1, combined));

  // Position on the gauge (0 to 100)
  const gaugePosition = Math.round((normalizedScore + 1) * 50);

  const label = normalizedScore > 0.3 ? 'Bullish' : normalizedScore < -0.3 ? 'Bearish' : 'Neutral';
  const color = normalizedScore > 0.3 ? 'text-emerald-600' : normalizedScore < -0.3 ? 'text-red-500' : 'text-amber-500';

  const totalPosts = posts.length;
  const totalEngagement = posts.reduce((sum, p) => {
    return sum + parseInt(p.likes || '0') + parseInt(p.retweets || '0');
  }, 0);

  return (
    <div className="bg-[var(--paper)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--cream)]">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Live Pulse
        </span>
      </div>

      <div className="p-4">
        {/* Sentiment label */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-lg font-bold ${color}`}>{label}</span>
          <span className="text-xs text-[var(--text-dim)]">
            {totalPosts} posts tracked
          </span>
        </div>

        {/* Gauge bar */}
        <div className="relative h-2 rounded-full bg-gradient-to-r from-red-200 via-amber-100 to-emerald-200 mb-2">
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--text)] border-2 border-white shadow-sm transition-all duration-500"
            style={{ left: `${gaugePosition}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-dim)] mb-4">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50 rounded-lg py-2 px-1">
            <div className="text-sm font-bold text-emerald-600">{bullish}</div>
            <div className="text-[10px] text-emerald-500">Bullish</div>
          </div>
          <div className="bg-gray-50 rounded-lg py-2 px-1">
            <div className="text-sm font-bold text-[var(--text-dim)]">{neutral}</div>
            <div className="text-[10px] text-[var(--text-dim)]">Neutral</div>
          </div>
          <div className="bg-red-50 rounded-lg py-2 px-1">
            <div className="text-sm font-bold text-red-500">{bearish}</div>
            <div className="text-[10px] text-red-400">Bearish</div>
          </div>
        </div>

        {/* Engagement */}
        {totalEngagement > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-dim)]">
            <span>Total engagement</span>
            <span className="font-mono font-semibold text-[var(--text)]">
              {totalEngagement.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
