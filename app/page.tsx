import ActiveEventPage from './components/ActiveEventPage';
import WalletButton from './components/WalletButton';
import ScoreTicker from './components/ScoreTicker';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Live Score Ticker */}
      <ScoreTicker />

      {/* Top Nav — glass blur, Clinical Kineticism style */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[var(--surface-container)]">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <Image src="/singls-logo.png" alt="SINGL" width={160} height={50} priority className="h-9 w-auto" />
            <div className="hidden md:flex gap-6">
              <Link href="/" className="text-[var(--primary-container)] font-bold text-sm uppercase tracking-tight border-b-2 border-[var(--primary-container)] pb-1">
                Markets
              </Link>
              <Link href="/leaderboard" className="text-[var(--secondary)] font-bold text-sm uppercase tracking-tight hover:text-[var(--primary-container)] transition-colors">
                Leaderboard
              </Link>
              <Link href="/profile" className="text-[var(--secondary)] font-bold text-sm uppercase tracking-tight hover:text-[var(--primary-container)] transition-colors">
                Portfolio
              </Link>
            </div>
          </div>
          <WalletButton />
        </div>
      </nav>

      {/* Active Event */}
      <ActiveEventPage />

      {/* Footer */}
      <footer className="bg-[var(--surface-container-low)] px-4 py-8 flex flex-col items-center gap-2">
        <Image src="/singls-logo.png" alt="SINGL" width={120} height={38} className="h-8 w-auto opacity-60" />
        <p className="text-xs text-[var(--secondary)]">by Spredd Markets</p>
        <a href="https://x.com/singlmarket" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--secondary)] hover:text-[var(--primary)] transition-colors">Follow us on X @singlmarket</a>
      </footer>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-[var(--surface-container)] px-6 py-3 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-[var(--primary-container)]">
          <span className="material-symbols-outlined text-xl">sensors</span>
          <span className="text-[10px] font-bold uppercase">Live</span>
        </Link>
        <Link href="/leaderboard" className="flex flex-col items-center gap-1 text-[var(--secondary)]">
          <span className="material-symbols-outlined text-xl">leaderboard</span>
          <span className="text-[10px] font-bold uppercase">Ranks</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-[var(--secondary)]">
          <span className="material-symbols-outlined text-xl">account_circle</span>
          <span className="text-[10px] font-bold uppercase">Portfolio</span>
        </Link>
      </div>
    </div>
  );
}
