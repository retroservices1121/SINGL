'use client';

// Small logo chip used inline next to a price to surface which venue is
// currently offering the best fill for that outcome. Uses AGG's public
// brand-asset CDN (same URLs their own UI uses), so no extra deps.

const VENUE_LOGO_BASE = 'https://assets.snagsolutions.io/public/prediction-markets/logos';
const VENUES = new Set([
  'kalshi', 'polymarket', 'limitless', 'opinion',
  'predict', 'probable', 'myriad', 'hyperliquid',
]);

const VENUE_TITLE: Record<string, string> = {
  polymarket: 'Polymarket',
  kalshi: 'Kalshi',
  limitless: 'Limitless',
  myriad: 'Myriad',
  opinion: 'Opinion',
  predict: 'Predict',
  probable: 'Probable',
  hyperliquid: 'Hyperliquid',
};

export default function VenueChip({ venue, size = 'sm' }: { venue: string | null | undefined; size?: 'xs' | 'sm' | 'md' }) {
  if (!venue) return null;
  const dimensions = size === 'xs' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  const title = VENUE_TITLE[venue] ?? venue;

  if (VENUES.has(venue)) {
    return (
      <img
        src={`${VENUE_LOGO_BASE}/${venue}.png`}
        alt={title}
        title={title}
        className={`${dimensions} rounded-full object-cover ring-1 ring-black/5`}
        loading="lazy"
      />
    );
  }

  // Unknown venue → letter fallback
  const text = size === 'xs' ? 'text-[8px]' : size === 'md' ? 'text-[10px]' : 'text-[9px]';
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center ${dimensions} ${text} rounded-full font-bold bg-zinc-600 text-white ring-1 ring-white/20`}
    >
      {venue.charAt(0).toUpperCase()}
    </span>
  );
}
