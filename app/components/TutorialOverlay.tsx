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
    title: 'Countries & Groups',
    description: 'Explore every country\'s championship odds, group stage standings, and knockout bracket. Switch views with the tabs above the market grid.',
    icon: 'flag',
  },
  {
    title: 'News, X & Video',
    description: 'Scroll down for real-time news, posts from X, TikToks, and YouTube coverage, all filtered to the active event so you stay informed.',
    icon: 'feed',
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
