'use client';

import { useEffect, useState } from 'react';
import type { EventData } from '@/app/types';
import EventPage from '@/app/components/EventPage';
import WalletButton from '@/app/components/WalletButton';
import Spinner from '@/app/components/ui/Spinner';
import { createPortal } from 'react-dom';

interface EventPageClientProps {
  slug: string;
}

export default function EventPageClient({ slug }: EventPageClientProps) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletMount, setWalletMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setWalletMount(document.getElementById('wallet-mount'));
  }, []);

  useEffect(() => {
    function fetchEvent() {
      fetch(`/api/events/${slug}`)
        .then(r => {
          if (!r.ok) throw new Error('Failed to load event');
          return r.json();
        })
        .then(data => {
          setEvent(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
    fetchEvent();
    const interval = setInterval(fetchEvent, 15000);
    return () => clearInterval(interval);
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-dim)]">{error || 'Event not found'}</p>
      </div>
    );
  }

  return (
    <>
      {walletMount && createPortal(<WalletButton />, walletMount)}
      <EventPage event={event} />
    </>
  );
}
