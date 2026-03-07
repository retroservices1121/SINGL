import Link from 'next/link';
import EventPageClient from './EventPageClient';

export default async function EventSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Nav */}
      <nav className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link href="/" className="font-heading text-xl font-bold text-[var(--orange)]">
              SINGLS
            </Link>
            <span className="text-xs font-bold text-[var(--yes)] bg-[var(--yes-bg)] px-2 py-0.5 rounded-full animate-pulse">
              LIVE
            </span>
          </div>
          <div id="wallet-mount" />
        </div>
      </nav>

      <EventPageClient slug={slug} />

      {/* Footer */}
      <footer className="bg-[var(--paper)] border-t border-[var(--border)] px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-dim)]">
          <span className="font-heading font-bold text-[var(--orange)]">SINGLS</span> by Spredd Markets
        </p>
      </footer>
    </div>
  );
}
