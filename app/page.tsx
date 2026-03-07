import EventPicker from './components/EventPicker';
import WalletButton from './components/WalletButton';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      {/* Nav */}
      <nav className="bg-[var(--paper)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-[var(--orange)]">SINGLS</h1>
          <WalletButton />
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-[var(--text)] mb-3">
          One event. Every market.
        </h2>
        <p className="text-[var(--text-sec)] text-base max-w-md mx-auto mb-8">
          Pick a specific event and get all prediction markets, news, social posts, and video coverage in one place.
        </p>
      </div>

      {/* Event Picker */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <EventPicker />
      </div>

      {/* Footer */}
      <footer className="bg-[var(--paper)] border-t border-[var(--border)] px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-dim)]">
          <span className="font-heading font-bold text-[var(--orange)]">SINGLS</span> by Spredd Markets
        </p>
      </footer>
    </div>
  );
}
