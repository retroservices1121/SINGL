import ProfileClient from './ProfileClient';
import WalletButton from '../components/WalletButton';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Portfolio | SINGL by Spredd Markets',
  description: 'View your prediction market positions and portfolio performance.',
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Top Nav */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[var(--surface-container)]">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Image src="/singls-logo.png" alt="SINGL" width={160} height={50} className="h-9 w-auto" />
            </Link>
            <div className="hidden md:flex items-center gap-6 font-heading font-bold uppercase tracking-tight">
              <Link href="/" className="text-[var(--secondary)] hover:text-[var(--primary-container)] transition-colors text-sm">
                Markets
              </Link>
              <Link href="/leaderboard" className="text-[var(--secondary)] hover:text-[var(--primary-container)] transition-colors text-sm">
                Leaderboard
              </Link>
              <Link href="/profile" className="text-[var(--primary-container)] border-b-2 border-[var(--primary-container)] pb-1 text-sm">
                Portfolio
              </Link>
            </div>
          </div>
          <WalletButton />
        </div>
      </nav>

      <main className="flex-1 max-w-screen-2xl mx-auto p-8 lg:p-12">
        <ProfileClient />
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-[var(--surface-container)] px-6 py-3 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-[var(--secondary)]">
          <span className="material-symbols-outlined text-xl">sensors</span>
          <span className="text-[10px] font-bold uppercase">Live</span>
        </Link>
        <Link href="/leaderboard" className="flex flex-col items-center gap-1 text-[var(--secondary)]">
          <span className="material-symbols-outlined text-xl">leaderboard</span>
          <span className="text-[10px] font-bold uppercase">Ranks</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-[var(--primary-container)]">
          <span className="material-symbols-outlined text-xl">account_circle</span>
          <span className="text-[10px] font-bold uppercase">Portfolio</span>
        </Link>
      </div>
    </div>
  );
}
