'use client';

import { useState, useEffect, useRef } from 'react';
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
  { href: '/markets', label: 'Markets' },
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

  // Tournament dropdown — click/tap to toggle (works on touch, where the
  // old hover-only menu did nothing), plus hover for desktop. Closes on
  // navigation, outside click, and Escape.
  const [tournamentOpen, setTournamentOpen] = useState(false);
  const tournamentRef = useRef<HTMLDivElement>(null);

  // Mobile menu — the desktop nav is hidden below md, so without this the
  // only reachable page on a phone is Trade.
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setTournamentOpen(false); setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!tournamentOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (tournamentRef.current && !tournamentRef.current.contains(e.target as Node)) {
        setTournamentOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTournamentOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tournamentOpen]);

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

          {/* Tournament dropdown — click/tap to toggle (touch-friendly),
              with hover open on desktop. The menu is absolutely positioned
              with a pt-2 bridge so the hover area stays continuous. */}
          <div
            ref={tournamentRef}
            className="relative"
            onMouseEnter={() => setTournamentOpen(true)}
            onMouseLeave={() => setTournamentOpen(false)}
          >
            <button
              type="button"
              onClick={() => setTournamentOpen(o => !o)}
              aria-haspopup="true"
              aria-expanded={tournamentOpen}
              className={`flex items-center gap-0.5 ${linkCls(tournamentActive)} cursor-pointer`}
            >
              Tournament
              <span className={`material-symbols-outlined text-sm transition-transform ${tournamentOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {tournamentOpen && (
              <div className="absolute left-0 top-full pt-2 z-50">
                <div className="min-w-[160px] rounded-lg bg-white shadow-ambient border border-[var(--surface-container)] py-1.5">
                  {TOURNAMENT_NAV.map(item => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setTournamentOpen(false)}
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
            )}
          </div>

          {TRAIL_NAV.map(renderLink)}
        </div>

        {/* AGG's ConnectButton auto-renders an auth chooser (Google, Email,
            SIWE, SIWS — whatever's registered in AggProvider's methods
            array) when signed out, and a profile/balance menu when signed
            in. Deposit/Withdraw clicks dispatch AGG's modal-open events
            which the SDK handles. */}
        <div className="flex items-center gap-2 shrink-0">
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

          {/* Mobile hamburger — only below md, where the inline nav is hidden. */}
          <button
            type="button"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
            aria-haspopup="true"
            aria-expanded={mobileOpen}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] cursor-pointer"
          >
            <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu panel — full list of pages, since the inline nav row is
          desktop-only. Closes on navigation (pathname effect) and Escape. */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--surface-container)] bg-white max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col px-4 py-3">
            {LEAD_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2.5 text-sm font-bold uppercase tracking-tight ${
                  isActive(item.href) ? 'text-[var(--primary-container)]' : 'text-[var(--on-surface)]'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--secondary)]">
              Tournament
            </div>
            {TOURNAMENT_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2.5 pl-3 text-sm font-bold uppercase tracking-tight ${
                  pathname.startsWith(item.href) ? 'text-[var(--primary-container)]' : 'text-[var(--on-surface)]'
                }`}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 mb-1 border-t border-[var(--surface-container)]" />
            {TRAIL_NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2.5 text-sm font-bold uppercase tracking-tight ${
                  isActive(item.href) ? 'text-[var(--primary-container)]' : 'text-[var(--on-surface)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
