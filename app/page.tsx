import ActiveEventPage from './components/ActiveEventPage';
import WalletButton from './components/WalletButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Nav */}
      <nav className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-[var(--orange)]">SINGLS</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-xs font-semibold text-[var(--text-sec)] hover:text-[var(--orange)] transition-colors"
            >
              Portfolio
            </Link>
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Active Event */}
      <ActiveEventPage />

      {/* Footer */}
      <footer className="bg-[var(--paper)] border-t border-[var(--border)] px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-dim)]">
          <span className="font-heading font-bold text-[var(--orange)]">SINGLS</span> by Spredd Markets
        </p>
      </footer>
    </div>
  );
}
