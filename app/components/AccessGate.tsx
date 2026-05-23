'use client';

import { useEffect, useState, type FormEvent } from 'react';

const STORAGE_KEY = 'agg_access_granted_v1';
const CODE_KEY = 'agg_access_code_v1';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getStoredAccessCode(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try { return localStorage.getItem(CODE_KEY); } catch { return null; }
}

export default function AccessGate({ children }: { children: React.ReactNode }) {
  // null = still checking (avoids gate flash for already-verified users)
  const [granted, setGranted] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fast path: localStorage flag set previously.
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        setGranted(true);
        return;
      }
    } catch { /* private mode etc. */ }

    // Slower path: cookie may have survived a localStorage clear.
    if (readCookie('agg_access') === 'granted') {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
      setGranted(true);
      return;
    }

    setGranted(false);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invalid access code');
        setSubmitting(false);
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, '1');
        // Stash the code so AggProvider can hand it to the SDK on auth requests.
        localStorage.setItem(CODE_KEY, code.trim());
      } catch {}
      setGranted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setSubmitting(false);
    }
  };

  if (granted === null) {
    // Nothing rendered while we check — avoids a gate flash for users
    // who already have access. Site shell SSRs from layout regardless.
    return <>{children}</>;
  }

  if (granted) return <>{children}</>;

  return (
    <>
      <div
        style={{ filter: 'blur(18px)', pointerEvents: 'none', userSelect: 'none' }}
        aria-hidden
      >
        {children}
      </div>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm bg-[var(--surface-container-lowest)] rounded-2xl p-8 shadow-2xl border-t-4 border-[var(--primary-container)] text-center space-y-5"
        >
          <div>
            <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-[var(--on-surface)]">
              SINGL Early Access
            </h2>
            <p className="text-sm text-[var(--secondary)] mt-1">
              Enter the access code provided by AGG Markets.
            </p>
          </div>

          <div>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="AGG-XXXX-XXXX"
              className="w-full text-center font-mono tracking-widest uppercase text-lg bg-[var(--surface-container-high)] rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary-container)] border-none"
            />
            {error && (
              <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="w-full gradient-cta text-white px-6 py-3 rounded-md font-black text-sm uppercase tracking-widest shadow-lg shadow-[var(--primary-container)]/30 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verifying…' : 'Unlock'}
          </button>

          <p className="text-[10px] text-[var(--secondary)] uppercase tracking-widest">
            Codes are single-use · No code? Reach out for an invite.
          </p>
        </form>
      </div>
    </>
  );
}
