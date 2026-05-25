import HomeClient from './HomeClient';
import SinglNav from './components/SinglNav';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SinglNav />
      <HomeClient />
    </div>
  );
}
