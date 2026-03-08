'use client';

import { useState, useEffect } from 'react';
import type { MarketData } from '@/app/types';

interface EventCountdownProps {
  markets: MarketData[];
}

export default function EventCountdown({ markets }: EventCountdownProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Find the earliest close/expiration time
  let closestTime: number | null = null;
  let closestLabel = '';

  for (const m of markets) {
    const closeTime = m.closeTime ? new Date(m.closeTime).getTime() : null;
    const expTime = m.expirationTime ? new Date(m.expirationTime).getTime() : null;
    const time = closeTime || expTime;
    if (time && time > now && (closestTime === null || time < closestTime)) {
      closestTime = time;
      closestLabel = closeTime ? 'Market closes' : 'Expires';
    }
  }

  if (!closestTime) return null;

  const diff = closestTime - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const isUrgent = diff < 24 * 3600000;
  const isCritical = diff < 3600000;

  return (
    <div className={`rounded-xl p-4 border ${
      isCritical
        ? 'bg-red-50 border-red-200'
        : isUrgent
        ? 'bg-orange-50 border-orange-200'
        : 'bg-[var(--paper)] border-[var(--border)]'
    }`}>
      <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">
        {closestLabel} in
      </div>
      <div className="flex items-baseline gap-1">
        {days > 0 && (
          <>
            <span className={`text-3xl font-bold font-mono ${isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-[var(--text)]'}`}>
              {days}
            </span>
            <span className="text-sm text-[var(--text-dim)] mr-2">d</span>
          </>
        )}
        <span className={`text-3xl font-bold font-mono ${isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-[var(--text)]'}`}>
          {String(hours).padStart(2, '0')}
        </span>
        <span className="text-sm text-[var(--text-dim)]">h</span>
        <span className={`text-3xl font-bold font-mono ${isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-[var(--text)]'}`}>
          {String(minutes).padStart(2, '0')}
        </span>
        <span className="text-sm text-[var(--text-dim)]">m</span>
        <span className={`text-3xl font-bold font-mono ${isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-[var(--text)]'}`}>
          {String(seconds).padStart(2, '0')}
        </span>
        <span className="text-sm text-[var(--text-dim)]">s</span>
      </div>
      <div className="text-xs text-[var(--text-dim)] mt-1">
        {new Date(closestTime).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {' at '}
        {new Date(closestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
      </div>
    </div>
  );
}
