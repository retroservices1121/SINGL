'use client';

import { useState, useEffect } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to SINGL',
    description: 'The single-event prediction market terminal. We go deep on one event at a time, giving you markets, data, and tools you can\'t get anywhere else.',
    icon: 'target',
  },
  {
    title: 'Live Markets',
    description: 'Browse prediction markets powered by Polymarket. See real-time prices, volume, and odds for every outcome. Tap any market card to see detailed charts and resolution rules.',
    icon: 'show_chart',
  },
  {
    title: 'Trade in Seconds',
    description: 'Connect your wallet, pick a side (Yes or No), set your amount, and trade. Your positions and P&L are tracked in your Portfolio.',
    icon: 'swap_horiz',
  },
  {
    title: 'Country Explorer',
    description: 'Tap "Countries" to see every nation\'s championship odds, form, and market data. Select a country card to dive into its full stats panel with round-by-round odds and sparklines.',
    icon: 'flag',
  },
  {
    title: 'Group Stage Tables',
    description: 'Switch to "Groups" to see all 12 World Cup groups with standings, advancement odds, and country profiles. Track which teams are favorites to qualify from each group.',
    icon: 'groups',
  },
  {
    title: 'Knockout Bracket',
    description: 'The "Bracket" view shows the full knockout stage from the Round of 32 to the Final. See projected matchups and championship odds at every stage.',
    icon: 'account_tree',
  },
  {
    title: 'Match Schedule',
    description: 'The "Schedule" tab shows upcoming matches with kick-off times, venues, and countdown timers. Never miss a game.',
    icon: 'calendar_month',
  },
  {
    title: 'Pick\'em Challenge',
    description: 'Play the free Pick\'em game. Predict which teams advance from each group, then pick your knockout bracket all the way to the champion. Share your picks on X and compete with friends.',
    icon: 'sports_score',
  },
  {
    title: 'Head to Head',
    description: 'Compare any two countries side by side in the "H2H" tab. See odds, group placement, and historical matchup context to inform your trades.',
    icon: 'compare_arrows',
  },
  {
    title: 'Squad Rosters',
    description: 'Browse full squad rosters for every country in the "Squads" tab. See who\'s been called up and how deep each team runs.',
    icon: 'person',
  },
  {
    title: 'Golden Boot & Awards',
    description: 'The "Awards" tab tracks Golden Boot contenders and other individual award markets. See which players are tipped for top scorer honors.',
    icon: 'emoji_events',
  },
  {
    title: 'News, X & Video',
    description: 'Scroll down for real-time news articles, posts from X, TikToks, and YouTube coverage, all filtered to the active event so you stay informed.',
    icon: 'feed',
  },
  {
    title: 'Portfolio',
    description: 'Track all your open positions, USDC balance, unrealized P&L, and trade history. Sell or redeem positions directly from the Portfolio page.',
    icon: 'account_balance_wallet',
  },
  {
    title: 'Leaderboard',
    description: 'Compete with other traders. The top performers are ranked on the Leaderboard with prizes for the best calls.',
    icon: 'leaderboard',
  },
  {
    title: 'You\'re All Set',
    description: 'Connect your wallet and start trading. Good luck!',
    icon: 'rocket_launch',
  },
];

const STORAGE_KEY = 'singl_tutorial_seen';

export default function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const close = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      localStorage.setItem(STORAGE_KEY, '1');
    }, 300);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      close();
    }
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={close} />

      {/* Card */}
      <div
        className={`relative z-10 w-[90vw] max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${exiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {/* Progress bar */}
        <div className="h-1 bg-[var(--surface-container-high)]">
          <div
            className="h-full bg-[var(--primary-container)] transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={close}
            className="absolute top-4 right-4 text-xs font-bold text-[var(--secondary)] hover:text-[var(--on-surface)] transition-colors cursor-pointer uppercase tracking-widest"
          >
            Skip
          </button>
        )}

        {/* Content */}
        <div className="px-8 pt-10 pb-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--primary-fixed)] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--primary)]">{current.icon}</span>
          </div>

          {/* Step counter */}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--secondary)] mb-2">
            {step + 1} of {STEPS.length}
          </p>

          {/* Title */}
          <h2 className="font-heading font-black text-2xl uppercase tracking-tight text-[var(--on-surface)] mb-3">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-[var(--secondary)] leading-relaxed max-w-sm mx-auto">
            {current.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === step
                  ? 'bg-[var(--primary-container)] w-6'
                  : i < step
                  ? 'bg-[var(--primary-fixed-dim)]'
                  : 'bg-[var(--surface-container-high)]'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="px-8 pb-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest bg-[var(--surface-container-high)] text-[var(--secondary)] hover:bg-[var(--surface-container-highest)] transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest bg-[var(--primary-container)] text-white hover:opacity-90 transition-all cursor-pointer"
          >
            {isLast ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
