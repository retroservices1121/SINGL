import ActiveEventPage from './components/ActiveEventPage';
import WalletButton from './components/WalletButton';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Nav */}
      <nav className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Image src="/singls-logo.png" alt="SINGL" width={160} height={50} priority className="h-10 w-auto" />
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
      <footer className="bg-[var(--paper)] border-t border-[var(--border)] px-4 py-6 flex flex-col items-center gap-2">
        <Image src="/singls-logo.png" alt="SINGL" width={120} height={38} className="h-8 w-auto" />
        <p className="text-xs text-[var(--text-dim)]">by Spredd Markets</p>
      </footer>
    </div>
  );
}
