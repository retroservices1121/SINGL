'use client';

import { countryFlagUrl, type FIFACountry } from '@/app/lib/fifa';

// Windows (incl. Win 11) ships no flag emoji in Segoe UI Emoji, so
// {country.flag} renders as two letter pairs (e.g. "US") rather than
// 🇺🇸. Use real PNGs via flagcdn.com — same approach AGG's own UI uses.
// Falls back to the Unicode emoji if the image fails to load, which at
// least gives Mac/Linux/Android users their native flag glyph.
interface Props {
  country: FIFACountry;
  className?: string;
  width?: 20 | 40 | 80 | 160; // flagcdn discrete widths
}

export default function CountryFlag({ country, className = 'w-6 h-4', width = 40 }: Props) {
  return (
    <img
      src={countryFlagUrl(country, width)}
      alt={country.name}
      width={width}
      height={Math.round((width * 3) / 4)}
      className={`${className} object-cover rounded-sm inline-block`}
      loading="lazy"
      onError={(e) => {
        // If flagcdn fails (very rare), swap to the Unicode emoji span.
        const img = e.currentTarget;
        const fallback = document.createElement('span');
        fallback.textContent = country.flag;
        fallback.className = img.className;
        img.replaceWith(fallback);
      }}
    />
  );
}
