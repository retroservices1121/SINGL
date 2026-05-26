'use client';

import { useRouter } from 'next/navigation';
import {
  UserProfilePage,
  requestAggDepositModalOpen,
  requestAggWithdrawModalOpen,
} from '@agg-build/ui';
import { useAggAuth } from '@agg-build/hooks';

// AGG's <UserProfilePage> is a (mostly) self-driving component — when
// props are omitted, it resolves the current user, balance, positions,
// activities, and open orders via AGG hooks internally. We just hand it
// the deposit/withdraw modal openers + navigation callbacks.
//
// Previous version of this file (custom 823-line Spredd/Polymarket
// portfolio renderer) is gone — replaced wholesale by AGG's component.
export default function ProfileClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAggAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32 text-[var(--secondary)] text-sm font-bold uppercase tracking-widest">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-32 text-center space-y-4">
        <p className="font-heading text-2xl font-black uppercase tracking-tight text-[var(--on-surface)]">
          Sign in to view your portfolio
        </p>
        <p className="text-sm text-[var(--secondary)]">
          Use the Sign in button in the top nav.
        </p>
      </div>
    );
  }

  return (
    <UserProfilePage
      onDeposit={() => requestAggDepositModalOpen()}
      onWithdraw={() => requestAggWithdrawModalOpen()}
      onEditProfile={() => router.push('/profile')}
      getPositionHref={(p) => (p.eventId ? `/event/${p.eventId}` : '#')}
      onPositionClick={(p) => {
        if (p.eventId) router.push(`/event/${p.eventId}`);
      }}
      getActivityHref={(a) => (a.kind === 'trade' && a.eventId ? `/event/${a.eventId}` : undefined) as string | undefined}
      onActivityClick={(a) => {
        if (a.kind === 'trade' && a.eventId) router.push(`/event/${a.eventId}`);
      }}
      onError={(err) => {
        console.error('[profile] UserProfilePage error:', err);
      }}
    />
  );
}
