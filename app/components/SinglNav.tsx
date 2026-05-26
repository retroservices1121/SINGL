'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ConnectButton } from '@agg-build/auth';
import {
  requestAggDepositModalOpen,
  requestAggWithdrawModalOpen,
} from '@agg-build/ui';
import { requestEditProfileOpen } from './EditProfileModalHost';

// Top-level routes. Order matches the visual priority: Trade first,
// then context (News/Videos), then FIFA-specific surfaces, then
// Portfolio. The bar is horizontally scrollable on narrow viewports
// (overflow-x-auto on the wrapper) so it never breaks the layout.
const PRIMARY_NAV: { href: string; label: string }[] = [
  { href: '/', label: 'Trade' },
  { href: '/news', label: 'News' },
  { href: '/countries', label: 'Countries' },
  { href: '/groups', label: 'Groups' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/bracket', label: 'Bracket' },
  { href: '/h2h', label: 'H2H' },
  { href: '/squads', label: 'Squads' },
  { href: '/pickem', label: "Pick'em" },
  { href: '/profile', label: 'Profile' },
];

// Single source of truth for the top nav. AGG pages mount with
// withHeader={false} and our SINGL pages also reuse this, so the chrome
// is consistent across the whole app.
export default function SinglNav() {
  const pathname = usePathname();
  const router = useRouter();
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
        {/* AGG's ConnectButton auto-renders an auth chooser (Google, Email,
            SIWE, SIWS — whatever's registered in AggProvider's methods
            array) when signed out, and a profile/balance menu when signed
            in. Deposit/Withdraw clicks dispatch AGG's modal-open events
            which the SDK handles. */}
        <div className="shrink-0">
          <ConnectButton
            onDepositClick={() => requestAggDepositModalOpen()}
            onWithdrawClick={() => requestAggWithdrawModalOpen()}
            // Profile card (the row at the top of the menu) goes to
            // /profile; the explicit "Profile" / Edit row opens the
            // ProfileModal so users can change username + avatar
            // without leaving the page.
            onProfileClick={() => requestEditProfileOpen()}
            onProfileCardClick={() => router.push('/profile')}
          />
        </div>
      </div>
    </nav>
  );
}
