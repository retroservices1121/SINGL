import ActiveEventPage from './components/ActiveEventPage';
import SinglNav from './components/SinglNav';

// AGG's <HomePage> uses /venue-events which is currently returning 500
// for our app (any params, any filters — confirmed via /api/health/agg).
// Until AGG support resolves it, the home renders our previous custom
// FIFA-locked ActiveEventPage. /event/[id] still uses AGG's
// EventMarketPage because /venue-events/<id> works.
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SinglNav />
      <ActiveEventPage />
    </div>
  );
}
