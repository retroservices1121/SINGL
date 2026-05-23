'use client';

// Small logo-style chip used inline next to a price to surface which venue
// is currently offering the best fill for that outcome. Uses a colored
// initial circle as a stand-in for a real logo — easy to swap to an <img>
// later when AGG exposes brand asset URLs or we host the marks ourselves.

const VENUE_STYLE: Record<string, { initial: string; bg: string; text: string; title: string }> = {
  polymarket:  { initial: 'P', bg: 'bg-purple-600',   text: 'text-white', title: 'Polymarket' },
  kalshi:      { initial: 'K', bg: 'bg-emerald-600',  text: 'text-white', title: 'Kalshi' },
  limitless:   { initial: 'L', bg: 'bg-blue-600',     text: 'text-white', title: 'Limitless' },
  myriad:      { initial: 'M', bg: 'bg-orange-500',   text: 'text-white', title: 'Myriad' },
  opinion:     { initial: 'O', bg: 'bg-indigo-600',   text: 'text-white', title: 'Opinion' },
  predict:     { initial: 'P', bg: 'bg-pink-600',     text: 'text-white', title: 'Predict' },
  probable:    { initial: 'P', bg: 'bg-sky-600',      text: 'text-white', title: 'Probable' },
  hyperliquid: { initial: 'H', bg: 'bg-teal-600',     text: 'text-white', title: 'Hyperliquid' },
};

export default function VenueChip({ venue, size = 'sm' }: { venue: string | null | undefined; size?: 'xs' | 'sm' | 'md' }) {
  if (!venue) return null;
  const style = VENUE_STYLE[venue] ?? {
    initial: venue.charAt(0).toUpperCase(),
    bg: 'bg-zinc-600',
    text: 'text-white',
    title: venue,
  };
  const dimensions = size === 'xs' ? 'w-3.5 h-3.5 text-[8px]' : size === 'md' ? 'w-5 h-5 text-[10px]' : 'w-4 h-4 text-[9px]';
  return (
    <span
      title={style.title}
      className={`inline-flex items-center justify-center ${dimensions} rounded-full font-bold ${style.bg} ${style.text} ring-1 ring-white/20`}
    >
      {style.initial}
    </span>
  );
}
