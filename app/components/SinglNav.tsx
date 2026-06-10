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

type NavItem = { href: string; label: string };

// Top-level items shown before / after the Tournament dropdown. The six
// FIFA reference pages live under "Tournament ▾" so the row stays short
// enough to never need a scrollbar (even with the wallet connected).
const LEAD_NAV: NavItem[] = [
  { href: '/', label: 'Trade' },
  { href: '/news', label: 'News' },
];
const TOURNAMENT_NAV: NavItem[] = [
  { href: '/countries', label: 'Countries' },
  { href: '/groups', label: 'Groups' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/bracket', label: 'Bracket' },
  { href: '/h2h', label: 'H2H' },
  { href: '/squads', label: 'Squads' },
];
const TRAIL_NAV: NavItem[] = [
  { href: '/oracle', label: 'Oracle' },
  { href: '/pickem', label: "Pick'em" },
  { href: '/leaderboard', label: 'Ranks' },
  { href: '/profile', label: 'Profile' },
];

// Single source of truth for the top nav. AGG pages mount with
// withHeader={false} and our SINGL pages also reuse this, so the chrome
// is consistent across the whole app.
export default function SinglNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const tournamentActive = TOURNAMENT_NAV.some(i => pathname.startsWith(i.href));

  const linkCls = (active: boolean) =>
    `whitespace-nowrap text-xs font-bold uppercase tracking-tight transition-colors ${
      active
        ? 'text-[var(--primary-container)] border-b-2 border-[var(--primary-container)] pb-1'
        : 'text-[var(--secondary)] hover:text-[var(--primary-container)]'
    }`;

  const renderLink = (item: NavItem) => (
    <Link key={item.href} href={item.href} className={linkCls(isActive(item.href))}>
      {item.label}
    </Link>
  );

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[var(--surface-container)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto gap-4">
        <Link href="/" className="shrink-0">
          <Image src="/singls-logo.png" alt="SINGL" width={160} height={50} priority className="h-9 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-4">
          {LEAD_NAV.map(renderLink)}

          {/* Tournament dropdown — hover-revealed (desktop nav). The menu is
              absolutely positioned with a pt-2 bridge so the hover area is
              continuous (no flicker gap between trigger and panel). */}
          <div className="relative group">
            <button type="button" className={`flex items-center gap-0.5 ${linkCls(tournamentActive)} cursor-pointer`}>
              Tournament
              <span className="material-symbols-outlined text-sm transition-transform group-hover:rotate-180">
                expand_more
              </span>
            </button>
            <div className="absolute left-0 top-full pt-2 hidden group-hover:block z-50">
              <div className="min-w-[160px] rounded-lg bg-white shadow-ambient border border-[var(--surface-container)] py-1.5">
                {TOURNAMENT_NAV.map(item => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-4 py-2 text-xs font-bold uppercase tracking-tight transition-colors ${
                        active
                          ? 'text-[var(--primary-container)] bg-[var(--surface-container-low)]'
                          : 'text-[var(--secondary)] hover:text-[var(--primary-container)] hover:bg-[var(--surface-container-low)]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {TRAIL_NAV.map(renderLink)}
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
