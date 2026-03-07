import ProfileClient from './ProfileClient';
import WalletButton from '../components/WalletButton';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <nav className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image src="/singls-logo.png" alt="SINGL" width={160} height={50} className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-xs font-semibold text-[var(--orange)]"
            >
              Portfolio
            </Link>
            <WalletButton />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-heading text-2xl font-bold text-[var(--text)] mb-6">Your Portfolio</h1>
        <ProfileClient />
      </div>
    </div>
  );
}
