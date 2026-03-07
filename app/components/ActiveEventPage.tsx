'use client';

import { useEffect, useState } from 'react';
import type { EventData } from '@/app/types';
import EventPage from './EventPage';
import Spinner from './ui/Spinner';

export default function ActiveEventPage() {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noEvent, setNoEvent] = useState(false);

  useEffect(() => {
    fetch('/api/active-event')
      .then(r => r.json())
      .then(data => {
        if (data.event) {
          setEvent(data.event);
        } else {
          setNoEvent(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setNoEvent(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (noEvent || !event) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-32 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="font-heading text-2xl font-bold text-[var(--text)] mb-2">
          No active event
        </h2>
        <p className="text-[var(--text-sec)] text-sm">
          Check back soon — the next market is being set up.
        </p>
      </div>
    );
  }

  return <EventPage event={event} />;
}
