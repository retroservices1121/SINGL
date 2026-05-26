import SinglNav from '@/app/components/SinglNav';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profile | SINGL by Spredd Markets',
  description: 'View your prediction market positions, balances, and activity.',
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SinglNav />
      <main className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
        <ProfileClient />
      </main>
    </div>
  );
}
