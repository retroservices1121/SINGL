import HomeClient from './HomeClient';
import SinglNav from './components/SinglNav';

// FIFA-curated home — uses AGG's <EventListItem> + useSearch (both
// hit known-good endpoints) to render AGG-look cards while AGG's
// /venue-events listing endpoint stays broken. /event/[id] continues
// to use AGG's EventMarketPage because /venue-events/<id> works.
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SinglNav />
      <HomeClient />
    </div>
  );
}
