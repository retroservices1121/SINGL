'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAggClient } from '@agg-build/hooks';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useAggClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const intent = params.get('intent');
    if (intent === 'link') {
      const token = params.get('link_confirm_token');
      if (!token) { setError('Missing link_confirm_token'); return; }
      (async () => {
        try {
          await client.linkAccountConfirm(token);
          router.replace('/profile');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to link account');
        }
      })();
      return;
    }

    const code = params.get('code');
    if (!code) {
      // Some flows auto-handle the callback; just bounce home.
      router.replace('/');
      return;
    }
    (async () => {
      try {
        await client.exchangeAuthCode(code);
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete sign-in');
      }
    })();
  }, [client, params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="max-w-md text-center space-y-4">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold">Sign-in failed</h1>
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => router.replace('/')} className="px-4 py-2 rounded-lg bg-white text-black">
              Back home
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Signing you in…</h1>
            <p className="text-zinc-400 text-sm">Hold tight, just finalizing.</p>
          </>
        )}
      </div>
    </div>
  );
}
