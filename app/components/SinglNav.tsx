'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import WalletButton from './WalletButton';

// Only routes that exist today. Phase 2 will re-add News, Videos,
// Countries, Groups, Schedule, Bracket, Pick'em as their own routes
// once we extract them from the FIFA EventPage tabs.
const PRIMARY_NAV: { href: string; label: string }[] = [
  { href: '/', label: 'Trade' },
  { href: '/profile', label: 'Portfolio' },
];

// Single source of truth for the top nav. AGG pages mount with
// withHeader={false} and our SINGL pages also reuse this, so the chrome
// is consistent across the whole app.
export default function SinglNav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[var(--surface-container)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto gap-6">
        <Link href="/" className="shrink-0">
          <Image src="/singls-logo.png" alt="SINGL" width={160} height={50} priority className="h-9 w-auto" />
        </Link>
        <div className="hidden md:flex gap-5 overflow-x-auto">
          {PRIMARY_NAV.map(item => {
            const active = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap text-sm font-bold uppercase tracking-tight transition-colors ${
                  active
                    ? 'text-[var(--primary-container)] border-b-2 border-[var(--primary-container)] pb-1'
                    : 'text-[var(--secondary)] hover:text-[var(--primary-container)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="shrink-0">
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
